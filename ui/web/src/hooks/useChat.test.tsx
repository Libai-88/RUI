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
});
