import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChat } from './useChat';
import type { AcpAdapter, AdapterEvent } from '../product/types';

function createFakeAdapter() {
  let listener: ((e: AdapterEvent) => void) | null = null;
  const adapter = {
    connect: vi.fn(async () => {}),
    disconnect: vi.fn(async () => {}),
    subscribe: vi.fn((l: (e: AdapterEvent) => void) => {
      listener = l;
      return () => {
        listener = null;
      };
    }),
    createSession: vi.fn(async () => 'sess-1'),
    loadSession: vi.fn(async () => {}),
    listSessions: vi.fn(async () => []),
    sendMessage: vi.fn(async () => 'msg-assistant'),
    cancelSession: vi.fn(async () => {}),
    respondToPermission: vi.fn(async () => {}),
  } as unknown as AcpAdapter;
  return { adapter, emit: (e: AdapterEvent) => listener?.(e) };
}

function createFakeAdapterWithReconnect() {
  let listener: ((e: AdapterEvent) => void) | null = null;
  const adapter = {
    connect: vi.fn(async () => {}),
    disconnect: vi.fn(async () => {}),
    subscribe: vi.fn((l: (e: AdapterEvent) => void) => {
      listener = l;
      return () => {
        listener = null;
      };
    }),
    createSession: vi.fn(async () => 'sess-1'),
    loadSession: vi.fn(async () => {}),
    listSessions: vi.fn(async () => []),
    sendMessage: vi.fn(async () => 'msg-assistant'),
    cancelSession: vi.fn(async () => {}),
    respondToPermission: vi.fn(async () => {}),
    reconnect: vi.fn(async () => {}),
  } as unknown as AcpAdapter;
  return { adapter, emit: (e: AdapterEvent) => listener?.(e) };
}

describe('useChat', () => {
  it('初始状态为 idle，消息列表为空', () => {
    const { adapter } = createFakeAdapter();
    const { result } = renderHook(() => useChat(adapter, 'sess-1'));
    expect(result.current.status).toBe('idle');
    expect(result.current.messages).toEqual([]);
  });

  it('sendMessage 立即添加用户消息并设置状态为 streaming', async () => {
    const { adapter } = createFakeAdapter();
    const { result } = renderHook(() => useChat(adapter, 'sess-1'));

    await act(async () => {
      await result.current.sendMessage('你好');
    });

    expect(result.current.messages.length).toBe(1);
    expect(result.current.messages[0].role).toBe('user');
    if (result.current.messages[0].role === 'user') {
      expect(result.current.messages[0].content).toBe('你好');
    }
    expect(result.current.status).toBe('streaming');
  });

  it('适配器发射 message-chunk 时累积到助手消息', async () => {
    const { adapter, emit } = createFakeAdapter();
    const { result } = renderHook(() => useChat(adapter, 'sess-1'));

    await act(async () => {
      await result.current.sendMessage('你好');
    });

    act(() => {
      emit({
        type: 'message-chunk',
        sessionId: 'sess-1',
        messageId: 'msg-assistant',
        delta: '你好',
      });
    });

    expect(result.current.messages.length).toBe(2);
    const assistant = result.current.messages[1];
    expect(assistant.role).toBe('assistant');
    if (assistant.role === 'assistant') {
      expect(assistant.content).toBe('你好');
      expect(assistant.isStreaming).toBe(true);
    }
  });

  it('适配器发射 message-complete 时结束流式并回到 idle', async () => {
    const { adapter, emit } = createFakeAdapter();
    const { result } = renderHook(() => useChat(adapter, 'sess-1'));

    await act(async () => {
      await result.current.sendMessage('你好');
    });

    act(() => {
      emit({
        type: 'message-chunk',
        sessionId: 'sess-1',
        messageId: 'msg-assistant',
        delta: '你好',
      });
    });

    act(() => {
      emit({
        type: 'message-complete',
        sessionId: 'sess-1',
        messageId: 'msg-assistant',
      });
    });

    expect(result.current.status).toBe('idle');
    const assistant = result.current.messages[1];
    if (assistant.role === 'assistant') {
      expect(assistant.isStreaming).toBe(false);
    }
  });

  it('多个 chunk 累积到同一条助手消息', async () => {
    const { adapter, emit } = createFakeAdapter();
    const { result } = renderHook(() => useChat(adapter, 'sess-1'));

    await act(async () => {
      await result.current.sendMessage('你好');
    });

    act(() => {
      emit({
        type: 'message-chunk',
        sessionId: 'sess-1',
        messageId: 'msg-assistant',
        delta: '你',
      });
    });
    act(() => {
      emit({
        type: 'message-chunk',
        sessionId: 'sess-1',
        messageId: 'msg-assistant',
        delta: '好',
      });
    });
    act(() => {
      emit({
        type: 'message-chunk',
        sessionId: 'sess-1',
        messageId: 'msg-assistant',
        delta: '！',
      });
    });

    expect(result.current.messages.length).toBe(2);
    const assistant = result.current.messages[1];
    if (assistant.role === 'assistant') {
      expect(assistant.content).toBe('你好！');
      expect(assistant.isStreaming).toBe(true);
    }
  });

  it('忽略其它 session 的事件', async () => {
    const { adapter, emit } = createFakeAdapter();
    const { result } = renderHook(() => useChat(adapter, 'sess-1'));

    await act(async () => {
      await result.current.sendMessage('你好');
    });

    act(() => {
      emit({
        type: 'message-chunk',
        sessionId: 'other-session',
        messageId: 'msg-assistant',
        delta: '不应被处理',
      });
    });

    expect(result.current.messages.length).toBe(1);
  });

  it('connection-interrupted 事件标记消息为 interrupted 状态并保留内容', async () => {
    const { adapter, emit } = createFakeAdapter();
    const { result } = renderHook(() => useChat(adapter, 'sess-1'));

    await act(async () => {
      await result.current.sendMessage('你好');
    });

    act(() => {
      emit({
        type: 'message-chunk',
        sessionId: 'sess-1',
        messageId: 'msg-assistant',
        delta: 'partial',
      });
    });

    act(() => {
      emit({
        type: 'connection-interrupted',
        sessionId: 'sess-1',
        messageId: 'msg-assistant',
      });
    });

    expect(result.current.status).toBe('interrupted');
    const assistant = result.current.messages.find((m) => m.role === 'assistant');
    expect(assistant).toBeDefined();
    if (assistant?.role === 'assistant') {
      expect(assistant.content).toBe('partial');
      expect(assistant.isStreaming).toBe(false);
    }
  });

  it('reconnect 调用 adapter.reconnect 并重置状态为 idle', async () => {
    const { adapter, emit } = createFakeAdapterWithReconnect();
    const { result } = renderHook(() => useChat(adapter, 'sess-1'));

    await act(async () => {
      await result.current.sendMessage('你好');
    });

    act(() => {
      emit({
        type: 'connection-interrupted',
        sessionId: 'sess-1',
        messageId: 'msg-assistant',
      });
    });
    expect(result.current.status).toBe('interrupted');

    await act(async () => {
      await result.current.reconnect();
    });

    expect(adapter.reconnect).toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
  });

  it('reconnect 在 adapter 无 reconnect 方法时不抛错', async () => {
    const { adapter } = createFakeAdapter();
    const { result } = renderHook(() => useChat(adapter, 'sess-1'));

    await act(async () => {
      await result.current.reconnect();
    });

    expect(result.current.status).toBe('idle');
  });

  it('resendLastMessage 使用最后一条用户消息内容重新发送', async () => {
    const { adapter } = createFakeAdapter();
    const { result } = renderHook(() => useChat(adapter, 'sess-1'));

    await act(async () => {
      await result.current.sendMessage('原始问题');
    });

    await act(async () => {
      await result.current.resendLastMessage();
    });

    expect(adapter.sendMessage).toHaveBeenCalledTimes(2);
    expect(adapter.sendMessage).toHaveBeenLastCalledWith('sess-1', '原始问题');
    expect(result.current.status).toBe('streaming');
  });

  it('resendLastMessage 无用户消息时不发送', async () => {
    const { adapter } = createFakeAdapter();
    const { result } = renderHook(() => useChat(adapter, 'sess-1'));

    await act(async () => {
      await result.current.resendLastMessage();
    });

    expect(adapter.sendMessage).not.toHaveBeenCalled();
  });

  it('tool-call-started 添加 ToolMessage 到消息列表', async () => {
    const { adapter, emit } = createFakeAdapter();
    const { result } = renderHook(() => useChat(adapter, 'sess-1'));

    act(() => {
      emit({
        type: 'tool-call-started',
        sessionId: 'sess-1',
        invocation: {
          id: 'tool-1',
          toolName: 'read_file',
          argumentsSummary: '{"path":"/tmp"}',
          status: 'in-progress',
          result: null,
        },
      });
    });

    expect(result.current.messages.length).toBe(1);
    const tool = result.current.messages[0];
    expect(tool.role).toBe('tool');
    if (tool.role === 'tool') {
      expect(tool.toolInvocation.id).toBe('tool-1');
      expect(tool.toolInvocation.toolName).toBe('read_file');
      expect(tool.toolInvocation.status).toBe('in-progress');
      expect(tool.toolInvocation.result).toBeNull();
    }
  });

  it('tool-call-updated 更新工具状态', async () => {
    const { adapter, emit } = createFakeAdapter();
    const { result } = renderHook(() => useChat(adapter, 'sess-1'));

    act(() => {
      emit({
        type: 'tool-call-started',
        sessionId: 'sess-1',
        invocation: {
          id: 'tool-1',
          toolName: 'read_file',
          argumentsSummary: '',
          status: 'in-progress',
          result: null,
        },
      });
    });
    act(() => {
      emit({
        type: 'tool-call-updated',
        sessionId: 'sess-1',
        invocationId: 'tool-1',
        status: 'failed',
      });
    });

    const tool = result.current.messages[0];
    if (tool.role === 'tool') {
      expect(tool.toolInvocation.status).toBe('failed');
    }
  });

  it('tool-result 设置工具结果并标记完成', async () => {
    const { adapter, emit } = createFakeAdapter();
    const { result } = renderHook(() => useChat(adapter, 'sess-1'));

    act(() => {
      emit({
        type: 'tool-call-started',
        sessionId: 'sess-1',
        invocation: {
          id: 'tool-1',
          toolName: 'read_file',
          argumentsSummary: '',
          status: 'in-progress',
          result: null,
        },
      });
    });
    act(() => {
      emit({
        type: 'tool-result',
        sessionId: 'sess-1',
        invocationId: 'tool-1',
        result: { content: '文件内容', isError: false },
      });
    });

    const tool = result.current.messages[0];
    if (tool.role === 'tool') {
      expect(tool.toolInvocation.status).toBe('completed');
      expect(tool.toolInvocation.result).toEqual({ content: '文件内容', isError: false });
    }
  });

  it('tool-result isError 时状态变为 failed', async () => {
    const { adapter, emit } = createFakeAdapter();
    const { result } = renderHook(() => useChat(adapter, 'sess-1'));

    act(() => {
      emit({
        type: 'tool-call-started',
        sessionId: 'sess-1',
        invocation: {
          id: 'tool-1',
          toolName: 'read_file',
          argumentsSummary: '',
          status: 'in-progress',
          result: null,
        },
      });
    });
    act(() => {
      emit({
        type: 'tool-result',
        sessionId: 'sess-1',
        invocationId: 'tool-1',
        result: { content: '失败', isError: true },
      });
    });

    const tool = result.current.messages[0];
    if (tool.role === 'tool') {
      expect(tool.toolInvocation.status).toBe('failed');
      expect(tool.toolInvocation.result?.isError).toBe(true);
    }
  });

  it('tool 事件不影响其它 session 的消息', async () => {
    const { adapter, emit } = createFakeAdapter();
    const { result } = renderHook(() => useChat(adapter, 'sess-1'));

    act(() => {
      emit({
        type: 'tool-call-started',
        sessionId: 'other-session',
        invocation: {
          id: 'tool-1',
          toolName: 'read_file',
          argumentsSummary: '',
          status: 'in-progress',
          result: null,
        },
      });
    });

    expect(result.current.messages.length).toBe(0);
  });
});
