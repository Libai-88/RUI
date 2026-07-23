import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  WebAcpAdapter,
  type AcpClient,
  type AcpClientFactory,
  type AcpClientCallbacks,
} from './webAcpAdapter';
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
    mockFactory = vi.fn(
      (_url: string, _callbacks: AcpClientCallbacks) => mockClient,
    );
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

  it('connect 调用客户端工厂并传递规范化 HTTP 基础 URL', async () => {
    await adapter.connect({
      endpoint: 'http://127.0.0.1:3000',
      workspace: '/tmp',
    });
    expect(mockFactory).toHaveBeenCalledWith(
      expect.stringContaining('http://127.0.0.1:3000'),
      expect.anything(),
    );
  });

  it('connect 传递回调对象给工厂', async () => {
    await adapter.connect({
      endpoint: 'http://127.0.0.1:3000',
      secretKey: 'my-secret',
      workspace: '/tmp',
    });
    expect(mockFactory).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ onSessionUpdate: expect.any(Function) }),
    );
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

  it('sendMessage 发射 message-chunk 事件当收到 agent_message_chunk 通知', async () => {
    const events: AdapterEvent[] = [];
    let capturedCallbacks: AcpClientCallbacks | null = null;
    const streamingFactory: AcpClientFactory = (_url, callbacks) => {
      capturedCallbacks = callbacks;
      return mockClient;
    };
    const streamAdapter = new WebAcpAdapter(streamingFactory);
    streamAdapter.subscribe((e) => events.push(e));
    await streamAdapter.connect({ endpoint: 'http://127.0.0.1:3000', workspace: '/tmp' });
    await streamAdapter.createSession({ path: '/tmp' });

    let resolvePrompt!: () => void;
    mockClient.sessionPrompt = vi.fn(
      () => new Promise<void>((r) => { resolvePrompt = r; }),
    );

    const sendPromise = streamAdapter.sendMessage('test-session-id', '你好');

    capturedCallbacks!.onSessionUpdate!({
      sessionId: 'test-session-id',
      update: {
        sessionUpdate: 'agent_message_chunk',
        content: { type: 'text', text: '你好' },
      },
    });
    capturedCallbacks!.onSessionUpdate!({
      sessionId: 'test-session-id',
      update: {
        sessionUpdate: 'agent_message_chunk',
        content: { type: 'text', text: '！' },
      },
    });

    resolvePrompt();
    await sendPromise;

    const chunks = events.filter((e) => e.type === 'message-chunk');
    expect(chunks.length).toBe(2);
    if (chunks[0].type === 'message-chunk') expect(chunks[0].delta).toBe('你好');
    if (chunks[1].type === 'message-chunk') expect(chunks[1].delta).toBe('！');
    const complete = events.find((e) => e.type === 'message-complete');
    expect(complete).toBeDefined();
  });

  it('handleSessionUpdate 忽略 agent_thought_chunk', async () => {
    const events: AdapterEvent[] = [];
    let capturedCallbacks: AcpClientCallbacks | null = null;
    const streamingFactory: AcpClientFactory = (_url, callbacks) => {
      capturedCallbacks = callbacks;
      return mockClient;
    };
    const streamAdapter = new WebAcpAdapter(streamingFactory);
    streamAdapter.subscribe((e) => events.push(e));
    await streamAdapter.connect({ endpoint: 'http://127.0.0.1:3000', workspace: '/tmp' });
    await streamAdapter.createSession({ path: '/tmp' });

    let resolvePrompt!: () => void;
    mockClient.sessionPrompt = vi.fn(
      () => new Promise<void>((r) => { resolvePrompt = r; }),
    );

    const sendPromise = streamAdapter.sendMessage('test-session-id', '你好');

    capturedCallbacks!.onSessionUpdate!({
      sessionId: 'test-session-id',
      update: {
        sessionUpdate: 'agent_thought_chunk',
        content: { type: 'text', text: '思考内容' },
      },
    });

    resolvePrompt();
    await sendPromise;

    const chunks = events.filter((e) => e.type === 'message-chunk');
    expect(chunks.length).toBe(0);
  });

  it('onDisconnect 发射 connection-interrupted 事件', async () => {
    const events: AdapterEvent[] = [];
    let capturedCallbacks: AcpClientCallbacks | null = null;
    const discFactory: AcpClientFactory = (_url, callbacks) => {
      capturedCallbacks = callbacks;
      return mockClient;
    };
    const discAdapter = new WebAcpAdapter(discFactory);
    discAdapter.subscribe((e) => events.push(e));
    await discAdapter.connect({ endpoint: 'http://127.0.0.1:3000', workspace: '/tmp' });
    await discAdapter.createSession({ path: '/tmp' });

    let resolvePrompt!: () => void;
    mockClient.sessionPrompt = vi.fn(
      () => new Promise<void>((r) => { resolvePrompt = r; }),
    );
    const sendPromise = discAdapter.sendMessage('test-session-id', 'hello');

    capturedCallbacks!.onDisconnect!('connection lost');

    const interrupted = events.find((e) => e.type === 'connection-interrupted');
    expect(interrupted).toBeDefined();
    if (interrupted?.type === 'connection-interrupted') {
      expect(interrupted.sessionId).toBe('test-session-id');
      expect(interrupted.messageId).toMatch(/^msg-/);
    }

    resolvePrompt();
    await sendPromise;
  });

  it('onDisconnect 后状态变为 disconnected', async () => {
    let capturedCallbacks: AcpClientCallbacks | null = null;
    const discFactory: AcpClientFactory = (_url, callbacks) => {
      capturedCallbacks = callbacks;
      return mockClient;
    };
    const discAdapter = new WebAcpAdapter(discFactory);
    await discAdapter.connect({ endpoint: 'http://127.0.0.1:3000', workspace: '/tmp' });

    capturedCallbacks!.onDisconnect!('connection lost');

    expect(discAdapter.getConnectionState().status).toBe('disconnected');
  });

  it('onDisconnect 无活跃消息时不发射 connection-interrupted', async () => {
    const events: AdapterEvent[] = [];
    let capturedCallbacks: AcpClientCallbacks | null = null;
    const discFactory: AcpClientFactory = (_url, callbacks) => {
      capturedCallbacks = callbacks;
      return mockClient;
    };
    const discAdapter = new WebAcpAdapter(discFactory);
    discAdapter.subscribe((e) => events.push(e));
    await discAdapter.connect({ endpoint: 'http://127.0.0.1:3000', workspace: '/tmp' });

    capturedCallbacks!.onDisconnect!('connection lost');

    const interrupted = events.filter((e) => e.type === 'connection-interrupted');
    expect(interrupted.length).toBe(0);
  });

  it('connect 传递 onDisconnect 回调给工厂', async () => {
    await adapter.connect({
      endpoint: 'http://127.0.0.1:3000',
      workspace: '/tmp',
    });
    expect(mockFactory).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ onDisconnect: expect.any(Function) }),
    );
  });

  it('reconnect 使用已存储的配置重新连接', async () => {
    let capturedCallbacks: AcpClientCallbacks | null = null;
    const discFactory: AcpClientFactory = (_url, callbacks) => {
      capturedCallbacks = callbacks;
      return mockClient;
    };
    const discAdapter = new WebAcpAdapter(discFactory);
    await discAdapter.connect({
      endpoint: 'http://127.0.0.1:3000',
      secretKey: 'k',
      workspace: '/tmp',
    });

    capturedCallbacks!.onDisconnect!('connection lost');
    expect(discAdapter.getConnectionState().status).toBe('disconnected');

    await discAdapter.reconnect();
    expect(discAdapter.getConnectionState().status).toBe('connected');
  });

  it('reconnect 未连接过时抛出错误', async () => {
    await expect(adapter.reconnect()).rejects.toThrow('无配置，无法重连');
  });
});
