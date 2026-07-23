import { describe, it, expect } from 'vitest';
import type {
  ConnectionState,
  Message,
  UserMessage,
  AssistantMessage,
  ToolInvocation,
  ToolResult,
  PermissionRequest,
  AdapterEvent,
  AcpAdapter,
  AcpConnectionConfig,
  SessionSnapshot,
  SessionSummary,
} from './types';

describe('RUI 产品层类型边界', () => {
  it('ConnectionState 覆盖所有连接状态', () => {
    const states: ConnectionState[] = [
      { status: 'disconnected' },
      { status: 'connecting' },
      { status: 'connected' },
      { status: 'authentication-failed', message: '密钥错误' },
      { status: 'service-unavailable', message: '服务不可达' },
      { status: 'protocol-error', message: '协议错误' },
      { status: 'processing' },
    ];

    expect(states).toHaveLength(7);
    expect(states.every((s) => typeof s.status === 'string')).toBe(true);
  });

  it('UserMessage 类型正确', () => {
    const msg: UserMessage = {
      id: 'msg-1',
      role: 'user',
      content: '你好',
      createdAt: '2025-01-01T00:00:00Z',
    };

    expect(msg.role).toBe('user');
    expect(msg.content).toBe('你好');
  });

  it('AssistantMessage 支持流式标记', () => {
    const msg: AssistantMessage = {
      id: 'msg-2',
      role: 'assistant',
      content: '正在回复',
      isStreaming: true,
      createdAt: '2025-01-01T00:00:01Z',
    };

    expect(msg.isStreaming).toBe(true);
  });

  it('ToolInvocation 初始状态为进行中', () => {
    const invocation: ToolInvocation = {
      id: 'tool-1',
      toolName: 'read_file',
      argumentsSummary: '读取 main.rs',
      status: 'in-progress',
      result: null,
    };

    expect(invocation.status).toBe('in-progress');
    expect(invocation.result).toBeNull();
  });

  it('ToolResult 区分成功和失败', () => {
    const success: ToolResult = { content: '文件内容', isError: false };
    const failure: ToolResult = { content: '文件不存在', isError: true };

    expect(success.isError).toBe(false);
    expect(failure.isError).toBe(true);
  });

  it('PermissionRequest 初始状态为 pending', () => {
    const req: PermissionRequest = {
      id: 'perm-1',
      toolName: 'write_file',
      description: '写入文件到工作目录',
      status: 'pending',
    };

    expect(req.status).toBe('pending');
  });

  it('AdapterEvent 覆盖所有事件类型', () => {
    const events: AdapterEvent[] = [
      { type: 'connection-state-changed', state: { status: 'connected' } },
      { type: 'session-created', sessionId: 's1', workspace: { path: '/tmp' } },
      { type: 'session-loaded', sessionId: 's1', messages: [] },
      { type: 'session-list-updated', sessions: [] },
      { type: 'message-chunk', sessionId: 's1', messageId: 'm1', delta: '你' },
      { type: 'message-complete', sessionId: 's1', messageId: 'm1' },
      { type: 'tool-call-started', sessionId: 's1', invocation: {
        id: 't1', toolName: 'read', argumentsSummary: '', status: 'in-progress', result: null,
      } },
      { type: 'tool-call-updated', sessionId: 's1', invocationId: 't1', status: 'completed' },
      { type: 'tool-result', sessionId: 's1', invocationId: 't1', result: { content: '', isError: false } },
      { type: 'permission-requested', sessionId: 's1', request: {
        id: 'p1', toolName: '', description: '', status: 'pending',
      } },
      { type: 'permission-resolved', sessionId: 's1', requestId: 'p1', allowed: true },
      { type: 'session-error', sessionId: 's1', message: '出错了' },
      { type: 'session-cancelled', sessionId: 's1' },
      { type: 'connection-interrupted', sessionId: 's1', messageId: null },
    ];

    const types = events.map((e) => e.type);
    expect(new Set(types).size).toBe(events.length);
  });

  it('AcpAdapter 接口契约完整', () => {
    const mockAdapter: AcpAdapter = {
      connect: async (_config: AcpConnectionConfig) => {},
      disconnect: async () => {},
      subscribe: (_listener: (event: AdapterEvent) => void) => () => {},
      createSession: async (_workspace: { path: string }) => 'session-id',
      loadSession: async (_sessionId: string) => {},
      listSessions: async () => [],
      sendMessage: async (_sessionId: string, _content: string) => 'message-id',
      cancelSession: async (_sessionId: string) => {},
      respondToPermission: async (_sessionId: string, _requestId: string, _allowed: boolean) => {},
    };

    expect(mockAdapter).toBeDefined();
    expect(typeof mockAdapter.connect).toBe('function');
    expect(typeof mockAdapter.subscribe).toBe('function');
    expect(typeof mockAdapter.createSession).toBe('function');
    expect(typeof mockAdapter.sendMessage).toBe('function');
  });

  it('SessionSnapshot 包含完整会话快照', () => {
    const snapshot: SessionSnapshot = {
      id: 'session-1',
      workspace: { path: 'D:/Rui/project' },
      messages: [],
      status: 'idle',
      provider: { provider: 'anthropic', model: 'claude-sonnet-4' },
    };

    expect(snapshot.status).toBe('idle');
    expect(snapshot.workspace.path).toBe('D:/Rui/project');
    expect(snapshot.provider?.model).toBe('claude-sonnet-4');
  });

  it('SessionSummary 包含列表摘要信息', () => {
    const summary: SessionSummary = {
      id: 'session-1',
      title: '测试会话',
      description: '关于项目初始化的讨论',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:10:00Z',
    };

    expect(summary.title).toBe('测试会话');
  });

  it('Message 联合类型覆盖所有消息角色', () => {
    const messages: Message[] = [
      { id: '1', role: 'user', content: '', createdAt: '' },
      { id: '2', role: 'assistant', content: '', isStreaming: false, createdAt: '' },
      { id: '3', role: 'system', content: '', createdAt: '' },
      { id: '4', role: 'tool', toolInvocation: {
        id: '', toolName: '', argumentsSummary: '', status: 'completed', result: null,
      }, createdAt: '' },
      { id: '5', role: 'error', content: '', createdAt: '' },
    ];

    const roles = messages.map((m) => m.role);
    expect(roles).toEqual(['user', 'assistant', 'system', 'tool', 'error']);
  });
});
