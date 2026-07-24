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

  function createStreamingAdapter() {
    const events: AdapterEvent[] = [];
    let capturedCallbacks: AcpClientCallbacks | null = null;
    const streamingFactory: AcpClientFactory = (_url, callbacks) => {
      capturedCallbacks = callbacks;
      return mockClient;
    };
    const streamAdapter = new WebAcpAdapter(streamingFactory);
    streamAdapter.subscribe((e) => events.push(e));
    return { streamAdapter, events, getCallbacks: () => capturedCallbacks };
  }

  it('tool_call 通知发射 tool-call-started 事件', async () => {
    const { streamAdapter, events, getCallbacks } = createStreamingAdapter();
    await streamAdapter.connect({ endpoint: 'http://127.0.0.1:3000', workspace: '/tmp' });
    await streamAdapter.createSession({ path: '/tmp' });

    getCallbacks()!.onSessionUpdate!({
      sessionId: 'test-session-id',
      update: {
        sessionUpdate: 'tool_call',
        toolCallId: 'tool-1',
        title: 'read_file',
        rawInput: { path: '/tmp/foo.txt' },
      },
    });

    const started = events.find((e) => e.type === 'tool-call-started');
    expect(started).toBeDefined();
    if (started?.type === 'tool-call-started') {
      expect(started.sessionId).toBe('test-session-id');
      expect(started.invocation.id).toBe('tool-1');
      expect(started.invocation.toolName).toBe('read_file');
      expect(started.invocation.status).toBe('in-progress');
      expect(started.invocation.result).toBeNull();
      expect(started.invocation.argumentsSummary).toBe('{"path":"/tmp/foo.txt"}');
    }
  });

  it('tool_call 缺省 toolCallId 时自动生成', async () => {
    const { streamAdapter, events, getCallbacks } = createStreamingAdapter();
    await streamAdapter.connect({ endpoint: 'http://127.0.0.1:3000', workspace: '/tmp' });
    await streamAdapter.createSession({ path: '/tmp' });

    getCallbacks()!.onSessionUpdate!({
      sessionId: 'test-session-id',
      update: {
        sessionUpdate: 'tool_call',
        title: 'search',
      },
    });

    const started = events.find((e) => e.type === 'tool-call-started');
    expect(started).toBeDefined();
    if (started?.type === 'tool-call-started') {
      expect(started.invocation.id).toMatch(/^tool-/);
      expect(started.invocation.toolName).toBe('search');
    }
  });

  it('tool_call 缺省 title 时使用默认工具名', async () => {
    const { streamAdapter, events, getCallbacks } = createStreamingAdapter();
    await streamAdapter.connect({ endpoint: 'http://127.0.0.1:3000', workspace: '/tmp' });
    await streamAdapter.createSession({ path: '/tmp' });

    getCallbacks()!.onSessionUpdate!({
      sessionId: 'test-session-id',
      update: {
        sessionUpdate: 'tool_call',
        toolCallId: 'tool-1',
      },
    });

    const started = events.find((e) => e.type === 'tool-call-started');
    expect(started).toBeDefined();
    if (started?.type === 'tool-call-started') {
      expect(started.invocation.toolName).toBe('未知工具');
    }
  });

  it('tool_call_update completed 发射 tool-result 事件', async () => {
    const { streamAdapter, events, getCallbacks } = createStreamingAdapter();
    await streamAdapter.connect({ endpoint: 'http://127.0.0.1:3000', workspace: '/tmp' });
    await streamAdapter.createSession({ path: '/tmp' });

    getCallbacks()!.onSessionUpdate!({
      sessionId: 'test-session-id',
      update: { sessionUpdate: 'tool_call', toolCallId: 'tool-1', title: 'read_file' },
    });
    getCallbacks()!.onSessionUpdate!({
      sessionId: 'test-session-id',
      update: {
        sessionUpdate: 'tool_call_update',
        toolCallId: 'tool-1',
        status: 'completed',
        rawOutput: '文件内容',
      },
    });

    const updated = events.filter((e) => e.type === 'tool-call-updated');
    expect(updated.length).toBe(1);
    if (updated[0].type === 'tool-call-updated') {
      expect(updated[0].invocationId).toBe('tool-1');
      expect(updated[0].status).toBe('completed');
    }
    const result = events.find((e) => e.type === 'tool-result');
    expect(result).toBeDefined();
    if (result?.type === 'tool-result') {
      expect(result.invocationId).toBe('tool-1');
      expect(result.result.content).toBe('文件内容');
      expect(result.result.isError).toBe(false);
    }
  });

  it('tool_call_update failed 发射 tool-result isError=true', async () => {
    const { streamAdapter, events, getCallbacks } = createStreamingAdapter();
    await streamAdapter.connect({ endpoint: 'http://127.0.0.1:3000', workspace: '/tmp' });
    await streamAdapter.createSession({ path: '/tmp' });

    getCallbacks()!.onSessionUpdate!({
      sessionId: 'test-session-id',
      update: { sessionUpdate: 'tool_call', toolCallId: 'tool-1', title: 'read_file' },
    });
    getCallbacks()!.onSessionUpdate!({
      sessionId: 'test-session-id',
      update: {
        sessionUpdate: 'tool_call_update',
        toolCallId: 'tool-1',
        status: 'failed',
        rawOutput: { error: '文件不存在' },
        title: 'read_file',
      },
    });

    const updated = events.filter((e) => e.type === 'tool-call-updated');
    expect(updated.length).toBe(1);
    if (updated[0].type === 'tool-call-updated') {
      expect(updated[0].status).toBe('failed');
    }
    const result = events.find((e) => e.type === 'tool-result');
    expect(result).toBeDefined();
    if (result?.type === 'tool-result') {
      expect(result.result.isError).toBe(true);
      expect(result.result.content).toContain('文件不存在');
    }
  });

  it('tool_call_update failed 无 rawOutput 时使用 title 作为错误内容', async () => {
    const { streamAdapter, events, getCallbacks } = createStreamingAdapter();
    await streamAdapter.connect({ endpoint: 'http://127.0.0.1:3000', workspace: '/tmp' });
    await streamAdapter.createSession({ path: '/tmp' });

    getCallbacks()!.onSessionUpdate!({
      sessionId: 'test-session-id',
      update: { sessionUpdate: 'tool_call', toolCallId: 'tool-1', title: 'read_file' },
    });
    getCallbacks()!.onSessionUpdate!({
      sessionId: 'test-session-id',
      update: {
        sessionUpdate: 'tool_call_update',
        toolCallId: 'tool-1',
        status: 'failed',
        title: '权限被拒绝',
      },
    });

    const result = events.find((e) => e.type === 'tool-result');
    expect(result).toBeDefined();
    if (result?.type === 'tool-result') {
      expect(result.result.content).toBe('权限被拒绝');
      expect(result.result.isError).toBe(true);
    }
  });

  it('tool_call_update in_progress 仅发射 tool-call-updated 事件', async () => {
    const { streamAdapter, events, getCallbacks } = createStreamingAdapter();
    await streamAdapter.connect({ endpoint: 'http://127.0.0.1:3000', workspace: '/tmp' });
    await streamAdapter.createSession({ path: '/tmp' });

    getCallbacks()!.onSessionUpdate!({
      sessionId: 'test-session-id',
      update: { sessionUpdate: 'tool_call', toolCallId: 'tool-1', title: 'read_file' },
    });
    getCallbacks()!.onSessionUpdate!({
      sessionId: 'test-session-id',
      update: {
        sessionUpdate: 'tool_call_update',
        toolCallId: 'tool-1',
        status: 'in_progress',
      },
    });

    const updated = events.filter((e) => e.type === 'tool-call-updated');
    expect(updated.length).toBe(1);
    if (updated[0].type === 'tool-call-updated') {
      expect(updated[0].status).toBe('in-progress');
    }
    const results = events.filter((e) => e.type === 'tool-result');
    expect(results.length).toBe(0);
  });

  it('tool_call_update 缺省 toolCallId 时被忽略', async () => {
    const { streamAdapter, events, getCallbacks } = createStreamingAdapter();
    await streamAdapter.connect({ endpoint: 'http://127.0.0.1:3000', workspace: '/tmp' });
    await streamAdapter.createSession({ path: '/tmp' });

    getCallbacks()!.onSessionUpdate!({
      sessionId: 'test-session-id',
      update: {
        sessionUpdate: 'tool_call_update',
        status: 'completed',
        rawOutput: '结果',
      },
    });

    const updated = events.filter((e) => e.type === 'tool-call-updated');
    expect(updated.length).toBe(0);
    const results = events.filter((e) => e.type === 'tool-result');
    expect(results.length).toBe(0);
  });

  it('summarizeToolArguments 处理字符串和对象', async () => {
    const { streamAdapter, events, getCallbacks } = createStreamingAdapter();
    await streamAdapter.connect({ endpoint: 'http://127.0.0.1:3000', workspace: '/tmp' });
    await streamAdapter.createSession({ path: '/tmp' });

    getCallbacks()!.onSessionUpdate!({
      sessionId: 'test-session-id',
      update: {
        sessionUpdate: 'tool_call',
        toolCallId: 'tool-str',
        title: 't1',
        rawInput: 'plain string args',
      },
    });
    getCallbacks()!.onSessionUpdate!({
      sessionId: 'test-session-id',
      update: {
        sessionUpdate: 'tool_call',
        toolCallId: 'tool-obj',
        title: 't2',
        rawInput: { foo: 'bar', n: 42 },
      },
    });

    const started = events.filter((e) => e.type === 'tool-call-started');
    expect(started.length).toBe(2);
    if (started[0].type === 'tool-call-started') {
      expect(started[0].invocation.argumentsSummary).toBe('plain string args');
    }
    if (started[1].type === 'tool-call-started') {
      expect(started[1].invocation.argumentsSummary).toBe('{"foo":"bar","n":42}');
    }
  });

  it('summarizeToolArguments 截断超长字符串', async () => {
    const { streamAdapter, events, getCallbacks } = createStreamingAdapter();
    await streamAdapter.connect({ endpoint: 'http://127.0.0.1:3000', workspace: '/tmp' });
    await streamAdapter.createSession({ path: '/tmp' });

    const longString = 'a'.repeat(300);
    getCallbacks()!.onSessionUpdate!({
      sessionId: 'test-session-id',
      update: {
        sessionUpdate: 'tool_call',
        toolCallId: 'tool-long',
        title: 't1',
        rawInput: longString,
      },
    });

    const started = events.find((e) => e.type === 'tool-call-started');
    expect(started).toBeDefined();
    if (started?.type === 'tool-call-started') {
      expect(started.invocation.argumentsSummary.length).toBe(200);
    }
  });

  // -------------------------------------------------------------------------
  // #11 Session 切换与状态隔离 - 多 Session 并发场景
  // -------------------------------------------------------------------------

  it('多 Session 并发流式：各 Session 的 chunk 使用各自的 messageId', async () => {
    const events: AdapterEvent[] = [];
    let capturedCallbacks: AcpClientCallbacks | null = null;
    const streamingFactory: AcpClientFactory = (_url, callbacks) => {
      capturedCallbacks = callbacks;
      return mockClient;
    };
    const streamAdapter = new WebAcpAdapter(streamingFactory);
    streamAdapter.subscribe((e) => events.push(e));
    await streamAdapter.connect({ endpoint: 'http://127.0.0.1:3000', workspace: '/tmp' });

    // 每个 session 的 prompt 独立 resolve
    const resolvers: Record<string, () => void> = {};
    mockClient.sessionPrompt = vi.fn(
      (params: { sessionId: string }) =>
        new Promise<void>((r) => { resolvers[params.sessionId] = r; }),
    );

    // 两个 session 同时发送消息（均未 resolve）
    const sendA = streamAdapter.sendMessage('session-A', '你好A');
    const sendB = streamAdapter.sendMessage('session-B', '你好B');

    // 交叉到达的 chunk
    capturedCallbacks!.onSessionUpdate!({
      sessionId: 'session-A',
      update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: 'A1' } },
    });
    capturedCallbacks!.onSessionUpdate!({
      sessionId: 'session-B',
      update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: 'B1' } },
    });
    capturedCallbacks!.onSessionUpdate!({
      sessionId: 'session-A',
      update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: 'A2' } },
    });

    // 完成
    resolvers['session-A']!();
    await sendA;
    resolvers['session-B']!();
    await sendB;

    const aChunks = events.filter(
      (e) => e.type === 'message-chunk' && e.sessionId === 'session-A',
    );
    const bChunks = events.filter(
      (e) => e.type === 'message-chunk' && e.sessionId === 'session-B',
    );

    // A 收到 2 个 chunk，B 收到 1 个 chunk
    expect(aChunks.length).toBe(2);
    expect(bChunks.length).toBe(1);
    // A 的两个 chunk 必须使用同一个 messageId
    if (aChunks[0].type === 'message-chunk' && aChunks[1].type === 'message-chunk') {
      expect(aChunks[0].messageId).toBe(aChunks[1].messageId);
      expect(aChunks[0].delta).toBe('A1');
      expect(aChunks[1].delta).toBe('A2');
    }
    // B 的 chunk 必须使用与 A 不同的 messageId
    if (bChunks[0].type === 'message-chunk' && aChunks[0].type === 'message-chunk') {
      expect(bChunks[0].messageId).not.toBe(aChunks[0].messageId);
      expect(bChunks[0].delta).toBe('B1');
    }
  });

  it('stale chunk：Session prompt 完成后到达的 chunk 被丢弃', async () => {
    const events: AdapterEvent[] = [];
    let capturedCallbacks: AcpClientCallbacks | null = null;
    const streamingFactory: AcpClientFactory = (_url, callbacks) => {
      capturedCallbacks = callbacks;
      return mockClient;
    };
    const streamAdapter = new WebAcpAdapter(streamingFactory);
    streamAdapter.subscribe((e) => events.push(e));
    await streamAdapter.connect({ endpoint: 'http://127.0.0.1:3000', workspace: '/tmp' });

    let resolvePrompt!: () => void;
    mockClient.sessionPrompt = vi.fn(
      () => new Promise<void>((r) => { resolvePrompt = r; }),
    );

    const sendPromise = streamAdapter.sendMessage('session-A', '你好');
    // prompt 完成前 chunk 正常发射
    capturedCallbacks!.onSessionUpdate!({
      sessionId: 'session-A',
      update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: '正常' } },
    });

    resolvePrompt();
    await sendPromise;

    // prompt 完成后到达的 stale chunk 应被丢弃（context 已清理）
    capturedCallbacks!.onSessionUpdate!({
      sessionId: 'session-A',
      update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: '过期' } },
    });

    const chunks = events.filter((e) => e.type === 'message-chunk');
    expect(chunks.length).toBe(1);
    if (chunks[0].type === 'message-chunk') {
      expect(chunks[0].delta).toBe('正常');
    }
  });

  it('stale prompt attempt 不覆盖新 Session 状态：同一 session 重新发送后旧 attempt 的 chunk 归到新 messageId', async () => {
    const events: AdapterEvent[] = [];
    let capturedCallbacks: AcpClientCallbacks | null = null;
    const streamingFactory: AcpClientFactory = (_url, callbacks) => {
      capturedCallbacks = callbacks;
      return mockClient;
    };
    const streamAdapter = new WebAcpAdapter(streamingFactory);
    streamAdapter.subscribe((e) => events.push(e));
    await streamAdapter.connect({ endpoint: 'http://127.0.0.1:3000', workspace: '/tmp' });

    const resolvers: (() => void)[] = [];
    mockClient.sessionPrompt = vi.fn(
      () => new Promise<void>((r) => { resolvers.push(r); }),
    );

    // 第一次发送（attempt 1），尚未 resolve
    const send1 = streamAdapter.sendMessage('session-A', '第一次');

    // 第二次发送（attempt 2），覆盖 context
    const send2 = streamAdapter.sendMessage('session-A', '第二次');

    // 此时 context 是 attempt 2 的，chunk 应归到 attempt 2 的 messageId
    capturedCallbacks!.onSessionUpdate!({
      sessionId: 'session-A',
      update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: 'chunk' } },
    });

    // 完成（按入队顺序 resolve）
    resolvers[0]!();
    await send1;
    resolvers[1]!();
    const msgId2 = await send2;

    const chunks = events.filter((e) => e.type === 'message-chunk');
    expect(chunks.length).toBe(1);
    if (chunks[0].type === 'message-chunk') {
      // chunk 必须归到 attempt 2 的 messageId
      expect(chunks[0].messageId).toBe(msgId2);
    }
  });

  it('多 Session 断线：所有活跃 Session 均收到 connection-interrupted', async () => {
    const events: AdapterEvent[] = [];
    let capturedCallbacks: AcpClientCallbacks | null = null;
    const discFactory: AcpClientFactory = (_url, callbacks) => {
      capturedCallbacks = callbacks;
      return mockClient;
    };
    const discAdapter = new WebAcpAdapter(discFactory);
    discAdapter.subscribe((e) => events.push(e));
    await discAdapter.connect({ endpoint: 'http://127.0.0.1:3000', workspace: '/tmp' });

    const resolvers: Record<string, () => void> = {};
    mockClient.sessionPrompt = vi.fn(
      (params: { sessionId: string }) =>
        new Promise<void>((r) => { resolvers[params.sessionId] = r; }),
    );

    // 两个 session 同时活跃
    const sendA = discAdapter.sendMessage('session-A', 'helloA');
    const sendB = discAdapter.sendMessage('session-B', 'helloB');

    // 断线
    capturedCallbacks!.onDisconnect!('connection lost');

    const interrupted = events.filter((e) => e.type === 'connection-interrupted');
    expect(interrupted.length).toBe(2);
    const sessionIds = interrupted.map((e) => (e as { sessionId: string }).sessionId).sort();
    expect(sessionIds).toEqual(['session-A', 'session-B']);

    resolvers['session-A']!();
    resolvers['session-B']!();
    await sendA;
    await sendB;
  });

  it('cancelSession 清理上下文：后续 chunk 被丢弃', async () => {
    const events: AdapterEvent[] = [];
    let capturedCallbacks: AcpClientCallbacks | null = null;
    const streamingFactory: AcpClientFactory = (_url, callbacks) => {
      capturedCallbacks = callbacks;
      return mockClient;
    };
    const streamAdapter = new WebAcpAdapter(streamingFactory);
    streamAdapter.subscribe((e) => events.push(e));
    await streamAdapter.connect({ endpoint: 'http://127.0.0.1:3000', workspace: '/tmp' });

    let resolvePrompt!: () => void;
    mockClient.sessionPrompt = vi.fn(
      () => new Promise<void>((r) => { resolvePrompt = r; }),
    );

    const sendPromise = streamAdapter.sendMessage('session-A', '你好');
    expect(streamAdapter.hasActivePrompt('session-A')).toBe(true);

    await streamAdapter.cancelSession('session-A');
    expect(streamAdapter.hasActivePrompt('session-A')).toBe(false);

    // cancel 后 chunk 应被丢弃
    capturedCallbacks!.onSessionUpdate!({
      sessionId: 'session-A',
      update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: '过期' } },
    });

    resolvePrompt();
    await sendPromise;

    const chunks = events.filter((e) => e.type === 'message-chunk');
    expect(chunks.length).toBe(0);
  });

  it('hasActivePrompt 在 sendMessage 期间为 true，完成后为 false', async () => {
    await adapter.connect({ endpoint: 'http://127.0.0.1:3000', workspace: '/tmp' });

    let resolvePrompt!: () => void;
    mockClient.sessionPrompt = vi.fn(
      () => new Promise<void>((r) => { resolvePrompt = r; }),
    );

    expect(adapter.hasActivePrompt('s1')).toBe(false);
    const sendPromise = adapter.sendMessage('s1', '你好');
    expect(adapter.hasActivePrompt('s1')).toBe(true);

    resolvePrompt();
    await sendPromise;
    expect(adapter.hasActivePrompt('s1')).toBe(false);
  });

  it('pendingPermissions 按 Session 隔离：register/get/respond 清理互不影响', async () => {
    await adapter.connect({ endpoint: 'http://127.0.0.1:3000', workspace: '/tmp' });

    adapter.registerPendingPermission('session-A', 'perm-1');
    adapter.registerPendingPermission('session-A', 'perm-2');
    adapter.registerPendingPermission('session-B', 'perm-3');

    expect(adapter.getPendingPermissionIds('session-A').sort()).toEqual(['perm-1', 'perm-2']);
    expect(adapter.getPendingPermissionIds('session-B')).toEqual(['perm-3']);

    // session-A 的 perm-1 被响应后从 pending 移除
    await adapter.respondToPermission('session-A', 'perm-1', true);
    expect(adapter.getPendingPermissionIds('session-A')).toEqual(['perm-2']);
    // session-B 不受影响
    expect(adapter.getPendingPermissionIds('session-B')).toEqual(['perm-3']);

    // session-A 最后一个 permission 被响应后集合清空
    await adapter.respondToPermission('session-A', 'perm-2', false);
    expect(adapter.getPendingPermissionIds('session-A')).toEqual([]);
    expect(adapter.getPendingPermissionIds('session-B')).toEqual(['perm-3']);
  });

  it('cancelSession 清理该 Session 的 pending permissions', async () => {
    await adapter.connect({ endpoint: 'http://127.0.0.1:3000', workspace: '/tmp' });

    adapter.registerPendingPermission('session-A', 'perm-1');
    adapter.registerPendingPermission('session-B', 'perm-2');

    await adapter.cancelSession('session-A');

    expect(adapter.getPendingPermissionIds('session-A')).toEqual([]);
    expect(adapter.getPendingPermissionIds('session-B')).toEqual(['perm-2']);
  });

  it('disconnect 清理所有 Session 的上下文和 pending permissions', async () => {
    await adapter.connect({ endpoint: 'http://127.0.0.1:3000', workspace: '/tmp' });

    let resolvePrompt!: () => void;
    mockClient.sessionPrompt = vi.fn(
      () => new Promise<void>((r) => { resolvePrompt = r; }),
    );

    const sendPromise = adapter.sendMessage('session-A', '你好');
    adapter.registerPendingPermission('session-A', 'perm-1');
    adapter.registerPendingPermission('session-B', 'perm-2');

    await adapter.disconnect();

    expect(adapter.hasActivePrompt('session-A')).toBe(false);
    expect(adapter.getPendingPermissionIds('session-A')).toEqual([]);
    expect(adapter.getPendingPermissionIds('session-B')).toEqual([]);

    resolvePrompt();
    await sendPromise.catch(() => {});
  });
});
