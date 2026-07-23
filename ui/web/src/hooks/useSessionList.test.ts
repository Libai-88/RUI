import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSessionList } from './useSessionList';
import type { AcpAdapter, AdapterEvent, SessionSummary } from '../product/types';

function makeSession(id: string, title: string = id): SessionSummary {
  return {
    id,
    title,
    description: '',
    createdAt: '',
    updatedAt: '',
  };
}

function createFakeAdapter(sessions: SessionSummary[] = []) {
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
    createSession: vi.fn(async () => 'new-sess'),
    loadSession: vi.fn(async () => {}),
    listSessions: vi.fn(async () => sessions),
    sendMessage: vi.fn(async () => 'msg-x'),
    cancelSession: vi.fn(async () => {}),
    respondToPermission: vi.fn(async () => {}),
  } as unknown as AcpAdapter;
  return { adapter, emit: (e: AdapterEvent) => listener?.(e) };
}

describe('useSessionList', () => {
  it('初始加载调用 listSessions', async () => {
    const { adapter } = createFakeAdapter([makeSession('s1'), makeSession('s2')]);
    const { result } = renderHook(() => useSessionList(adapter));

    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(2);
    });
    expect(adapter.listSessions).toHaveBeenCalled();
  });

  it('selectSession 调用 loadSession 并设置 activeSessionId', async () => {
    const { adapter } = createFakeAdapter([]);
    const { result } = renderHook(() => useSessionList(adapter));

    await waitFor(() => {
      expect(adapter.listSessions).toHaveBeenCalled();
    });

    await act(async () => {
      await result.current.selectSession('s1');
    });

    expect(adapter.loadSession).toHaveBeenCalledWith('s1');
    expect(result.current.activeSessionId).toBe('s1');
  });

  it('并发加载同一 session 不重复请求', async () => {
    let resolveLoad: () => void = () => {};
    const loadSession = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveLoad = resolve;
        }),
    );
    const adapter = {
      connect: vi.fn(async () => {}),
      disconnect: vi.fn(async () => {}),
      subscribe: vi.fn(() => () => {}),
      createSession: vi.fn(async () => 'new-sess'),
      loadSession,
      listSessions: vi.fn(async () => []),
      sendMessage: vi.fn(async () => 'msg-x'),
      cancelSession: vi.fn(async () => {}),
      respondToPermission: vi.fn(async () => {}),
    } as unknown as AcpAdapter;

    const { result } = renderHook(() => useSessionList(adapter));

    await waitFor(() => {
      expect(adapter.listSessions).toHaveBeenCalled();
    });

    await act(async () => {
      const p1 = result.current.selectSession('s1');
      const p2 = result.current.selectSession('s1');
      resolveLoad();
      await Promise.all([p1, p2]);
    });

    expect(loadSession).toHaveBeenCalledTimes(1);
  });

  it('refresh 重新获取列表', async () => {
    const { adapter } = createFakeAdapter([]);
    const { result } = renderHook(() => useSessionList(adapter));

    await waitFor(() => {
      expect(adapter.listSessions).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(adapter.listSessions).toHaveBeenCalledTimes(2);
  });

  it('session-created 事件设置 activeSessionId', async () => {
    const { adapter, emit } = createFakeAdapter([]);
    const { result } = renderHook(() => useSessionList(adapter));

    await waitFor(() => {
      expect(adapter.listSessions).toHaveBeenCalled();
    });

    act(() => {
      emit({
        type: 'session-created',
        sessionId: 'new-1',
        workspace: { path: '/tmp' },
      });
    });

    await waitFor(() => {
      expect(adapter.listSessions).toHaveBeenCalledTimes(2);
    });
    expect(result.current.activeSessionId).toBe('new-1');
  });

  it('createNewSession 清除 activeSessionId', async () => {
    const { adapter } = createFakeAdapter([]);
    const { result } = renderHook(() => useSessionList(adapter));

    await waitFor(() => {
      expect(adapter.listSessions).toHaveBeenCalled();
    });

    await act(async () => {
      await result.current.selectSession('s1');
    });
    expect(result.current.activeSessionId).toBe('s1');

    await act(async () => {
      await result.current.createNewSession();
    });
    expect(result.current.activeSessionId).toBeNull();
  });

  it('session-list-updated 事件更新列表', async () => {
    const { adapter, emit } = createFakeAdapter([]);
    const { result } = renderHook(() => useSessionList(adapter));

    await waitFor(() => {
      expect(adapter.listSessions).toHaveBeenCalled();
    });
    expect(result.current.sessions).toHaveLength(0);

    act(() => {
      emit({
        type: 'session-list-updated',
        sessions: [makeSession('a'), makeSession('b')],
      });
    });

    expect(result.current.sessions).toHaveLength(2);
  });
});
