import { useCallback } from 'react';
import type { AcpAdapter, Message, SessionId, SessionStatus } from '../product/types';

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface SessionActionsResult {
  sendMessage: (content: string) => Promise<void>;
  cancel: () => Promise<void>;
  reconnect: () => Promise<void>;
  resendLastMessage: () => Promise<void>;
  resolvePermission: (requestId: string, allowed: boolean, scope?: 'once' | 'always') => Promise<void>;
}

interface UseSessionActionsOptions {
  adapter: AcpAdapter | null;
  sessionId: SessionId | null;
  messages: Message[];
  addMessage: (message: Message) => void;
  setStatus: React.Dispatch<React.SetStateAction<SessionStatus>>;
}

/**
 * 会话动作 hook。
 *
 * 职责：send / cancel / reconnect / resend / resolvePermission。
 * 不持有状态——消息和状态变更委托给 useMessageStore。
 */
export function useSessionActions({
  adapter,
  sessionId,
  messages,
  addMessage,
  setStatus,
}: UseSessionActionsOptions): SessionActionsResult {
  const sendMessage = useCallback(
    async (content: string) => {
      if (!adapter || !sessionId) return;
      if (!content.trim()) return;
      addMessage({
        id: generateId('msg'),
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
      });
      setStatus('streaming');
      await adapter.sendMessage(sessionId, content);
    },
    [adapter, sessionId, addMessage, setStatus],
  );

  const cancel = useCallback(async () => {
    if (!adapter || !sessionId) return;
    await adapter.cancelSession(sessionId);
  }, [adapter, sessionId]);

  const reconnect = useCallback(async () => {
    if (!adapter?.reconnect) return;
    await adapter.reconnect();
    setStatus('idle');
  }, [adapter, setStatus]);

  const resendLastMessage = useCallback(async () => {
    if (!adapter || !sessionId) return;
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser || lastUser.role !== 'user') return;
    setStatus('streaming');
    await adapter.sendMessage(sessionId, lastUser.content);
  }, [adapter, sessionId, messages, setStatus]);

  const resolvePermission = useCallback(
    async (requestId: string, allowed: boolean, scope: 'once' | 'always' = 'once') => {
      if (!adapter || !sessionId) return;
      await adapter.respondToPermission(sessionId, requestId, allowed, scope);
    },
    [adapter, sessionId],
  );

  return { sendMessage, cancel, reconnect, resendLastMessage, resolvePermission };
}
