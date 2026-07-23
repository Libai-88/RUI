import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testConnection } from './connectionTest';
import type { AcpConnectionConfig } from '../product/types';

// mock fetch
function mockFetch(
  statusFn: (url: string) => { status: number; ok: boolean },
): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    const { status, ok } = statusFn(url);
    return {
      status,
      ok,
      statusText: '',
      headers: new Headers(),
      text: async () => '',
      json: async () => ({}),
      blob: async () => new Blob(),
      arrayBuffer: async () => new ArrayBuffer(0),
      formData: async () => new FormData(),
      clone() {
        return this as Response;
      },
      body: null,
      bodyUsed: false,
      type: 'basic' as ResponseType,
      url,
      redirected: false,
    } as Response;
  }) as typeof fetch;
}

describe('connectionTest', () => {
  const validConfig: AcpConnectionConfig = {
    endpoint: 'http://127.0.0.1:3000',
    secretKey: 'my-secret',
    workspace: '/tmp',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('无效 URL 格式返回失败', async () => {
    const result = await testConnection({
      ...validConfig,
      endpoint: 'not-a-url',
    });
    expect(result.success).toBe(false);
    expect(result.reason).toBe('protocol-error');
  });

  it('非 http/https 协议返回失败', async () => {
    const result = await testConnection({
      ...validConfig,
      endpoint: 'ftp://127.0.0.1:3000',
    });
    expect(result.success).toBe(false);
    expect(result.reason).toBe('protocol-error');
  });

  it('/status 成功且 /acp 返回 406 表示连接成功', async () => {
    globalThis.fetch = mockFetch((url) => {
      if (url.includes('/status')) return { status: 200, ok: true };
      if (url.includes('/acp')) return { status: 406, ok: false };
      return { status: 404, ok: false };
    });

    const result = await testConnection(validConfig);
    expect(result.success).toBe(true);
  });

  it('/status 返回 401 表示认证失败', async () => {
    globalThis.fetch = mockFetch((url) => {
      if (url.includes('/status')) return { status: 401, ok: false };
      return { status: 404, ok: false };
    });

    const result = await testConnection(validConfig);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('auth-failed');
  });

  it('fetch 抛出异常表示服务不可达', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error('connection refused');
    }) as typeof fetch;

    const result = await testConnection(validConfig);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('service-unavailable');
  });

  it('/status 成功但 /acp 返回 401 表示认证失败', async () => {
    globalThis.fetch = mockFetch((url) => {
      if (url.includes('/status')) return { status: 200, ok: true };
      if (url.includes('/acp')) return { status: 401, ok: false };
      return { status: 404, ok: false };
    });

    const result = await testConnection(validConfig);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('auth-failed');
  });

  it('无 secretKey 时也正常工作', async () => {
    globalThis.fetch = mockFetch((url) => {
      if (url.includes('/status')) return { status: 200, ok: true };
      if (url.includes('/acp')) return { status: 406, ok: false };
      return { status: 404, ok: false };
    });

    const result = await testConnection({
      endpoint: 'http://127.0.0.1:3000',
      workspace: '/tmp',
    });
    expect(result.success).toBe(true);
  });

  it('自动移除末尾 /acp 后缀', async () => {
    const capturedUrls: string[] = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      capturedUrls.push(url);
      if (url.includes('/status')) return { status: 200, ok: true } as Response;
      return { status: 406, ok: false } as Response;
    }) as typeof fetch;

    await testConnection({
      ...validConfig,
      endpoint: 'http://127.0.0.1:3000/acp',
    });

    // /status 请求不应包含 /acp/status
    const statusUrl = capturedUrls.find((u) => u.includes('/status'));
    expect(statusUrl).toBeDefined();
    expect(statusUrl).not.toContain('/acp/status');
  });
});
