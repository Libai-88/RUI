import { describe, it, expect, vi } from 'vitest';
import { createGooseClientFactory } from './gooseClientFactory';

vi.mock('@aaif/goose-sdk', () => {
  const MockGooseClient = vi.fn(function (this: unknown, _callbacks: unknown, _baseUrl: unknown) {
    return {
      initialize: vi.fn().mockResolvedValue(undefined),
      closed: Promise.resolve(),
      newSession: vi.fn().mockResolvedValue({ sessionId: 'sess-1' }),
      loadSession: vi.fn().mockResolvedValue({ messages: [] }),
      listSessions: vi.fn().mockResolvedValue({ sessions: [] }),
      prompt: vi.fn().mockResolvedValue(undefined),
      cancel: vi.fn().mockResolvedValue(undefined),
      extMethod: vi.fn().mockResolvedValue(undefined),
    };
  });
  return { GooseClient: MockGooseClient };
});

vi.mock('@agentclientprotocol/sdk', () => ({
  PROTOCOL_VERSION: '2025-04-01',
}));

describe('createGooseClientFactory', () => {
  it('返回工厂函数', () => {
    const factory = createGooseClientFactory();
    expect(typeof factory).toBe('function');
  });

  it('工厂函数创建 AcpClient 实例', () => {
    const factory = createGooseClientFactory();
    const callbacks = {
      onSessionUpdate: vi.fn(),
      onDisconnect: vi.fn(),
    };
    const client = factory('http://127.0.0.1:3000', callbacks);
    expect(client).toBeDefined();
    expect(typeof client.newSession).toBe('function');
    expect(typeof client.loadSession).toBe('function');
    expect(typeof client.unstable_listSessions).toBe('function');
    expect(typeof client.sessionPrompt).toBe('function');
    expect(typeof client.sessionCancel).toBe('function');
    expect(typeof client.sessionUpdate).toBe('function');
  });
});