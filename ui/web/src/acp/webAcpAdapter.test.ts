import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebAcpAdapter, type AcpClient, type AcpClientFactory } from './webAcpAdapter';
import type { AdapterEvent } from '../product/types';

/** 创建 mock 客户端 */
function createMockClient(): AcpClient {
  return {
    newSession: vi.fn(async () => ({ sessionId: 'test-session-id' })),
    loadSession: vi.fn(async () => ({ messages: [] })),
    unstable_listSessions: vi.fn(async () => ({ sessions: [] })),
    sessionPrompt: vi.fn(async () => ({})),
    sessionCancel: vi.fn(async () => ({})),
    sessionUpdate: vi.fn(async () => ({})),
  };
}

describe('WebAcpAdapter', () => {
  let adapter: WebAcpAdapter;
  let mockClient: AcpClient;
  let mockFactory: AcpClientFactory;

  beforeEach(() => {
    mockClient = createMockClient();
    mockFactory = vi.fn(() => mockClient);
    adapter = new WebAcpAdapter(mockFactory);
  });

  it('初始状态为 disconnected', () => {
    expect(adapter.getConnectionState().status).toBe('disconnected');
  });

  it('connect 成功后状态变为 connected', async () => {
    await adapter.connect({
      endpoint: 'http://127.0.0.1:3000',
      secretKey: 'test-secret',
      workspace: '/tmp',
    });
    expect(adapter.getConnectionState().status).toBe('connected');
  });

  it('connect 调用客户端工厂', async () => {
    await adapter.connect({
      endpoint: 'http://127.0.0.1:3000',
      workspace: '/tmp',
    });
    expect(mockFactory).toHaveBeenCalledWith(expect.stringContaining('ws://127.0.0.1:3000/acp'));
  });

  it('connect 构建 ws URL 包含 token', async () => {
    await adapter.connect({
      endpoint: 'http://127.0.0.1:3000',
      secretKey: 'my-secret',
      workspace: '/tmp',
    });
    expect(mockFactory).toHaveBeenCalledWith(expect.stringContaining('token=my-secret'));
  });

  it('disconnect 后状态回到 disconnected', async () => {
    await adapter.connect({
      endpoint: 'http://127.0.0.1:3000',
      workspace: '/tmp',
    });
    await adapter.disconnect();
    expect(adapter.getConnectionState().status).toBe('disconnected');
  });

  it('subscribe 接收连接状态变更事件', async () => {
    const events: AdapterEvent[] = [];
    adapter.subscribe((e) => events.push(e));

    await adapter.connect({
      endpoint: 'http://127.0.0.1:3000',
      workspace: '/tmp',
    });

    const stateChanges = events.filter((e) => e.type === 'connection-state-changed');
    expect(stateChanges.length).toBeGreaterThan(0);
  });

  it('createSession 返回 session ID', async () => {
    await adapter.connect({
      endpoint: 'http://127.0.0.1:3000',
      workspace: '/tmp',
    });

    const sessionId = await adapter.createSession({ path: 'D:/Rui/project' });
    expect(sessionId).toBe('test-session-id');
  });

  it('createSession 传递 cwd 到客户端', async () => {
    await adapter.connect({
      endpoint: 'http://127.0.0.1:3000',
      workspace: '/tmp',
    });

    await adapter.createSession({ path: 'D:/Rui/project' });
    expect(mockClient.newSession).toHaveBeenCalledWith({
      cwd: 'D:/Rui/project',
      mcpServers: [],
      _meta: { client: 'rui-web' },
    });
  });

  it('createSession 空工作目录抛出错误', async () => {
    await adapter.connect({
      endpoint: 'http://127.0.0.1:3000',
      workspace: '/tmp',
    });

    await expect(adapter.createSession({ path: '' })).rejects.toThrow('工作目录不能为空');
  });

  it('createSession 未连接时抛出错误', async () => {
    await expect(adapter.createSession({ path: '/tmp' })).rejects.toThrow('ACP 未连接');
  });

  it('createSession 发射 session-created 事件', async () => {
    const events: AdapterEvent[] = [];
    adapter.subscribe((e) => events.push(e));

    await adapter.connect({
      endpoint: 'http://127.0.0.1:3000',
      workspace: '/tmp',
    });

    await adapter.createSession({ path: 'D:/Rui/project' });

    const created = events.find((e) => e.type === 'session-created');
    expect(created).toBeDefined();
    if (created?.type === 'session-created') {
      expect(created.sessionId).toBe('test-session-id');
      expect(created.workspace.path).toBe('D:/Rui/project');
    }
  });

  it('listSessions 返回空数组', async () => {
    await adapter.connect({
      endpoint: 'http://127.0.0.1:3000',
      workspace: '/tmp',
    });

    const sessions = await adapter.listSessions();
    expect(sessions).toEqual([]);
  });

  it('sendMessage 返回 message ID', async () => {
    await adapter.connect({
      endpoint: 'http://127.0.0.1:3000',
      workspace: '/tmp',
    });
    await adapter.createSession({ path: '/tmp' });

    const messageId = await adapter.sendMessage('test-session-id', '你好');
    expect(messageId).toMatch(/^msg-/);
  });

  it('cancelSession 发射 session-cancelled 事件', async () => {
    const events: AdapterEvent[] = [];
    adapter.subscribe((e) => events.push(e));

    await adapter.connect({
      endpoint: 'http://127.0.0.1:3000',
      workspace: '/tmp',
    });

    await adapter.cancelSession('test-session-id');

    const cancelled = events.find((e) => e.type === 'session-cancelled');
    expect(cancelled).toBeDefined();
  });

  it('respondToPermission 发射 permission-resolved 事件', async () => {
    const events: AdapterEvent[] = [];
    adapter.subscribe((e) => events.push(e));

    await adapter.connect({
      endpoint: 'http://127.0.0.1:3000',
      workspace: '/tmp',
    });

    await adapter.respondToPermission('s1', 'p1', true);

    const resolved = events.find((e) => e.type === 'permission-resolved');
    expect(resolved).toBeDefined();
    if (resolved?.type === 'permission-resolved') {
      expect(resolved.allowed).toBe(true);
    }
  });

  it('connect 失败时状态为 service-unavailable', async () => {
    const failingFactory: AcpClientFactory = () => {
      throw new Error('连接被拒绝');
    };
    const failAdapter = new WebAcpAdapter(failingFactory);

    await expect(
      failAdapter.connect({
        endpoint: 'http://127.0.0.1:3000',
        workspace: '/tmp',
      }),
    ).rejects.toThrow('连接被拒绝');

    expect(failAdapter.getConnectionState().status).toBe('service-unavailable');
  });
});
