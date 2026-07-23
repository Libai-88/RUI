import type { AcpConnectionConfig } from '../product/types';

/** localStorage 中存储 RUI 连接配置的键 */
const STORAGE_KEY = 'rui:connection-config';

/** 从 localStorage 读取连接配置 */
export function loadConnectionConfig(): AcpConnectionConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<AcpConnectionConfig>;
    if (!parsed.endpoint || typeof parsed.endpoint !== 'string') return null;

    return {
      endpoint: parsed.endpoint,
      secretKey: parsed.secretKey || undefined,
      workspace: parsed.workspace || '',
    };
  } catch {
    return null;
  }
}

/** 保存连接配置到 localStorage */
export function saveConnectionConfig(config: AcpConnectionConfig): void {
  const data: AcpConnectionConfig = {
    endpoint: config.endpoint,
    secretKey: config.secretKey || undefined,
    workspace: config.workspace,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** 清除连接配置 */
export function clearConnectionConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** 检查是否已有保存的连接配置 */
export function hasConnectionConfig(): boolean {
  return loadConnectionConfig() !== null;
}
