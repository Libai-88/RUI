import { useState, useEffect, useCallback } from 'react';
import type { AcpAdapter, Message, SessionId, SessionStatus } from '../product/types';
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
}

export function useChat(
  adapter: AcpAdapter | null,
  sessionId: SessionId | null,
): UseChatResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<SessionStatus>('idle');

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
        setStatus('cancelled');
      } else if (event.type === 'session-error') {
        setStatus('error');
      } else if (event.type === 'connection-interrupted') {
        setMessages((prev) => markInterrupted(prev, event.messageId));
        setStatus('interrupted');
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

  return { messages, status, sendMessage, cancel, reconnect, resendLastMessage };
}
