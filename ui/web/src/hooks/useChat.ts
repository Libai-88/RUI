import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  AcpAdapter,
  Message,
  PermissionMessage,
  PermissionRequest,
  SessionId,
  SessionStatus,
} from '../product/types';
import { accumulateChunk, finalizeMessage, markInterrupted } from '../chat/messageAccumulator';

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface UseChatResult {
  messages: Message[];
  status: SessionStatus;
  sendMessage: (content: string) => Promise<void>;
  cancel: () => Promise<void>;
  reconnect: () => Promise<void>;
  resendLastMessage: () => Promise<void>;
  /** 响应权限请求；scope 为 'always' 时表示"始终允许/始终拒绝" */
  resolvePermission: (requestId: string, allowed: boolean, scope?: 'once' | 'always') => Promise<void>;
  /** 当前 Session 中所有仍处于 pending 状态的权限请求，供上下文区展示 */
  pendingPermissions: PermissionRequest[];
}

export function useChat(
  adapter: AcpAdapter | null,
  sessionId: SessionId | null,
  initialMessages?: Message[],
): UseChatResult {
  const [messages, setMessages] = useState<Message[]>(initialMessages ?? []);
  const [status, setStatus] = useState<SessionStatus>('idle');

  useEffect(() => {
    setMessages(initialMessages ?? []);
    // intentionally not depending on initialMessages to avoid resets on re-render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    if (!adapter || !sessionId) return;
    return adapter.subscribe((event) => {
      if (!('sessionId' in event)) return;
      if (event.sessionId !== sessionId) return;
      if (event.type === 'message-chunk') {
        setMessages((prev) => accumulateChunk(prev, event));
      } else if (event.type === 'message-complete') {
        setMessages((prev) => finalizeMessage(prev, event.messageId));
        setStatus('idle');
      } else if (event.type === 'session-cancelled') {
        setMessages((prev) =>
          prev.map((m) =>
            m.role === 'assistant' && m.isStreaming ? { ...m, isStreaming: false } : m,
          ),
        );
        // 取消后状态收敛为 idle，允许用户继续发送
        setStatus('idle');
      } else if (event.type === 'session-error') {
        setStatus('error');
      } else if (event.type === 'connection-interrupted') {
        setMessages((prev) => markInterrupted(prev, event.messageId));
        setStatus('interrupted');
      } else if (event.type === 'tool-call-started') {
        const toolMessage: Message = {
          id: generateId('tool-msg'),
          role: 'tool',
          toolInvocation: event.invocation,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, toolMessage]);
      } else if (event.type === 'tool-call-updated') {
        setMessages((prev) => prev.map((m) => {
          if (m.role !== 'tool') return m;
          if (m.toolInvocation.id !== event.invocationId) return m;
          return { ...m, toolInvocation: { ...m.toolInvocation, status: event.status } };
        }));
      } else if (event.type === 'tool-result') {
        setMessages((prev) => prev.map((m) => {
          if (m.role !== 'tool') return m;
          if (m.toolInvocation.id !== event.invocationId) return m;
          return {
            ...m,
            toolInvocation: {
              ...m.toolInvocation,
              result: event.result,
              status: event.result.isError ? 'failed' : 'completed',
            },
          };
        }));
      } else if (event.type === 'session-loaded') {
        setMessages(event.messages);
        setStatus('idle');
      } else if (event.type === 'permission-requested') {
        const permissionMessage: Message = {
          id: `permission-${event.request.id}`,
          role: 'permission',
          request: event.request,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, permissionMessage]);
        // Session 在 pending permission 解决前不恢复 streaming 展示
        setStatus('waiting-for-permission');
      } else if (event.type === 'permission-resolved') {
        setMessages((prev) =>
          prev.map((m) =>
            m.role === 'permission' && m.request.id === event.requestId
              ? { ...m, request: { ...m.request, status: event.allowed ? 'allowed' : 'denied' } }
              : m,
          ),
        );
        // 权限决议后，若当前正处于等待权限状态，恢复为 streaming（agent 会继续该轮响应）
        setStatus((prev) => (prev === 'waiting-for-permission' ? 'streaming' : prev));
      }
    });
  }, [adapter, sessionId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!adapter || !sessionId) return;
      if (!content.trim()) return;
      const userMessage: Message = {
        id: generateId('msg'),
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setStatus('streaming');
      await adapter.sendMessage(sessionId, content);
    },
    [adapter, sessionId],
  );

  const cancel = useCallback(async () => {
    if (!adapter || !sessionId) return;
    await adapter.cancelSession(sessionId);
  }, [adapter, sessionId]);

  const reconnect = useCallback(async () => {
    if (!adapter?.reconnect) return;
    await adapter.reconnect();
    setStatus('idle');
  }, [adapter]);

  const resendLastMessage = useCallback(async () => {
    if (!adapter || !sessionId) return;
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser || lastUser.role !== 'user') return;
    setStatus('streaming');
    await adapter.sendMessage(sessionId, lastUser.content);
  }, [adapter, sessionId, messages]);

  const resolvePermission = useCallback(
    async (requestId: string, allowed: boolean, scope: 'once' | 'always' = 'once') => {
      if (!adapter || !sessionId) return;
      await adapter.respondToPermission(sessionId, requestId, allowed, scope);
    },
    [adapter, sessionId],
  );

  const pendingPermissions = useMemo(
    () =>
      messages
        .filter((m): m is PermissionMessage => m.role === 'permission')
        .map((m) => m.request)
        .filter((r) => r.status === 'pending'),
    [messages],
  );

  return {
    messages,
    status,
    sendMessage,
    cancel,
    reconnect,
    resendLastMessage,
    resolvePermission,
    pendingPermissions,
  };
}
