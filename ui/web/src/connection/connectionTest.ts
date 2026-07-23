import type { AcpConnectionConfig } from '../product/types';

/** 连接测试结果 */
export interface ConnectionTestResult {
  success: boolean;
  message: string;
  /** 连接失败的具体原因分类 */
  reason?: 'auth-failed' | 'service-unavailable' | 'protocol-error' | 'unknown';
}

/** 单次请求超时（毫秒） */
const PROBE_TIMEOUT_MS = 3000;

/** 规范化基础 URL，确保不含 /acp 后缀 */
function normalizeBaseUrl(endpoint: string): string {
  let url = endpoint.trim();
  // 移除末尾斜杠
  while (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  // 移除末尾的 /acp
  if (url.endsWith('/acp')) {
    url = url.slice(0, -4);
  }
  return url;
}

/** 带超时的 fetch */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 测试与 Goose ACP 服务的连接。
 *
 * 探测策略与 desktop 一致：
 * 1. GET {base}/status with X-Secret-Key header
 * 2. GET {base}/acp?token={secret} — 期望返回 406（表示已通过鉴权但需要 SSE）
 */
export async function testConnection(
  config: AcpConnectionConfig,
): Promise<ConnectionTestResult> {
  const baseUrl = normalizeBaseUrl(config.endpoint);

  // 验证 URL 格式
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    return {
      success: false,
      message: 'ACP 地址格式无效，请输入完整的 HTTP 地址',
      reason: 'protocol-error',
    };
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return {
      success: false,
      message: 'ACP 地址必须以 http:// 或 https:// 开头',
      reason: 'protocol-error',
    };
  }

  // 第一步：探测 /status 端点
  const statusUrl = `${baseUrl}/status`;
  const headers: Record<string, string> = {};
  if (config.secretKey) {
    headers['X-Secret-Key'] = config.secretKey;
  }

  let statusResponse: Response;
  try {
    statusResponse = await fetchWithTimeout(
      statusUrl,
      { method: 'GET', headers },
      PROBE_TIMEOUT_MS,
    );
  } catch {
    return {
      success: false,
      message: '无法连接到 ACP 服务，请检查地址和网络',
      reason: 'service-unavailable',
    };
  }

  if (statusResponse.status === 401 || statusResponse.status === 403) {
    return {
      success: false,
      message: '认证失败，请检查 Secret Key',
      reason: 'auth-failed',
    };
  }

  if (!statusResponse.ok) {
    return {
      success: false,
      message: `ACP 服务返回异常状态码 ${statusResponse.status}`,
      reason: 'service-unavailable',
    };
  }

  // 第二步：探测 /acp 端点（期望 406）
  const acpUrl = new URL(`${baseUrl}/acp`);
  if (config.secretKey) {
    acpUrl.searchParams.set('token', config.secretKey);
  }

  let acpResponse: Response;
  try {
    acpResponse = await fetchWithTimeout(
      acpUrl.toString(),
      { method: 'GET' },
      PROBE_TIMEOUT_MS,
    );
  } catch {
    // /status 成功但 /acp 超时，仍认为服务在线
    return {
      success: true,
      message: 'ACP 服务已连接',
    };
  }

  // 406 表示已通过鉴权，但需要 SSE（这是正常的）
  if (acpResponse.status === 406) {
    return {
      success: true,
      message: 'ACP 服务已连接，认证通过',
    };
  }

  if (acpResponse.status === 401 || acpResponse.status === 403) {
    return {
      success: false,
      message: '认证失败，请检查 Secret Key',
      reason: 'auth-failed',
    };
  }

  // /status 成功，/acp 返回其他状态码，仍认为服务可用
  return {
    success: true,
    message: 'ACP 服务已连接',
  };
}
