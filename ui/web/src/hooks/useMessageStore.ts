import { useState, useEffect, useCallback } from 'react';
import type { AcpAdapter, Message, SessionId, SessionStatus } from '../product/types';
import {
  accumulateContent,
  finalizeContent,
  markInterrupted,
} from '../chat/messageAccumulator';

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface MessageStoreResult {
  messages: Message[];
  status: SessionStatus;
  addMessage: (message: Message) => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setStatus: React.Dispatch<React.SetStateAction<SessionStatus>>;
}

/**
 * 消息状态管理 hook。
 *
 * 职责：消息列表状态 + 会话状态 + adapter 事件订阅。
 * 不包含任何业务动作（send/cancel/reconnect）。
 */
export function useMessageStore(
  adapter: AcpAdapter | null,
  sessionId: SessionId | null,
  initialMessages?: Message[],
): MessageStoreResult {
  const [messages, setMessages] = useState<Message[]>(initialMessages ?? []);
  const [status, setStatus] = useState<SessionStatus>('idle');

  // sessionId 变更时重置消息列表
  useEffect(() => {
    setMessages(initialMessages ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // 订阅 adapter 事件，更新 messages 和 status
  useEffect(() => {
    if (!adapter || !sessionId) return;
    return adapter.subscribe((event) => {
      if (!('sessionId' in event)) return;
      if (event.sessionId !== sessionId) return;

      switch (event.type) {
        case 'message-chunk':
          setMessages((prev) => accumulateContent(prev, event.messageId, event.delta, 'assistant'));
          break;

        case 'message-complete':
          setMessages((prev) => finalizeContent(prev, event.messageId, 'assistant'));
          setMessages((prev) => finalizeContent(prev, `thought-${sessionId}`, 'thought'));
          setStatus('idle');
          break;

        case 'session-cancelled':
          setMessages((prev) =>
            prev.map((m) =>
              m.role === 'assistant' && m.isStreaming
                ? { ...m, isStreaming: false }
                : m,
            ),
          );
          setMessages((prev) => finalizeContent(prev, `thought-${sessionId}`, 'thought'));
          setStatus('idle');
          break;

        case 'session-error':
          setStatus('error');
          break;

        case 'connection-interrupted':
          setMessages((prev) => markInterrupted(prev, event.messageId));
          setMessages((prev) => finalizeContent(prev, `thought-${sessionId}`, 'thought'));
          setStatus('interrupted');
          break;

        case 'tool-call-started':
          setMessages((prev) => [
            ...prev,
            {
              id: generateId('tool-msg'),
              role: 'tool' as const,
              toolInvocation: event.invocation,
              createdAt: new Date().toISOString(),
            },
          ]);
          break;

        case 'tool-call-updated':
          setMessages((prev) =>
            prev.map((m) => {
              if (m.role !== 'tool') return m;
              if (m.toolInvocation.id !== event.invocationId) return m;
              return {
                ...m,
                toolInvocation: { ...m.toolInvocation, status: event.status },
              };
            }),
          );
          break;

        case 'tool-result':
          setMessages((prev) =>
            prev.map((m) => {
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
            }),
          );
          break;

        case 'session-loaded':
          setMessages(event.messages);
          setStatus('idle');
          break;

        case 'permission-requested':
          setMessages((prev) => [
            ...prev,
            {
              id: `permission-${event.request.id}`,
              role: 'permission' as const,
              request: event.request,
              createdAt: new Date().toISOString(),
            },
          ]);
          setStatus('waiting-for-permission');
          break;

        case 'permission-resolved':
          setMessages((prev) =>
            prev.map((m) =>
              m.role === 'permission' && m.request.id === event.requestId
                ? {
                    ...m,
                    request: {
                      ...m.request,
                      status: event.allowed ? 'allowed' : 'denied',
                    },
                  }
                : m,
            ),
          );
          setStatus((prev) =>
            prev === 'waiting-for-permission' ? 'streaming' : prev,
          );
          break;

        case 'thought-chunk':
          setMessages((prev) => accumulateContent(prev, event.messageId, event.delta, 'thought'));
          break;

        case 'thought-complete':
          setMessages((prev) => finalizeContent(prev, event.messageId, 'thought'));
          break;
      }
    });
  }, [adapter, sessionId]);

  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  return { messages, status, addMessage, setMessages, setStatus };
}
