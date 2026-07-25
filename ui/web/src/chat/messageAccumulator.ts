import type { Message, AssistantMessage, ThoughtMessage, MessageId } from '../product/types';

type StreamingRole = 'assistant' | 'thought';

function createStreamingMessage(
  messageId: MessageId,
  delta: string,
  role: StreamingRole,
): AssistantMessage | ThoughtMessage {
  const base = { id: messageId, content: delta, isStreaming: true, createdAt: new Date().toISOString() };
  return role === 'assistant'
    ? { ...base, role: 'assistant' as const }
    : { ...base, role: 'thought' as const };
}

/** 累积流式 chunk 到消息列表（assistant 或 thought） */
export function accumulateContent(
  messages: Message[],
  messageId: MessageId,
  delta: string,
  role: StreamingRole,
): Message[] {
  const existing = messages.find(
    (m): m is AssistantMessage | ThoughtMessage =>
      m.role === role && m.id === messageId,
  );
  if (existing) {
    return messages.map((m) =>
      m === existing
        ? { ...m, content: m.content + delta, isStreaming: true }
        : m,
    );
  }
  return [...messages, createStreamingMessage(messageId, delta, role)];
}

/** 标记流式消息为完成（assistant 或 thought） */
export function finalizeContent(
  messages: Message[],
  messageId: MessageId,
  role?: StreamingRole,
): Message[] {
  return messages.map((m) => {
    if (m.id !== messageId) return m;
    if (role && m.role !== role) return m;
    if (m.role !== 'assistant' && m.role !== 'thought') return m;
    return { ...m, isStreaming: false };
  });
}

/** 标记消息为连接中断（停止流式光标但保留已接收内容） */
export function markInterrupted(
  messages: Message[],
  messageId: MessageId | null,
): Message[] {
  if (!messageId) return messages;
  return messages.map((m) =>
    m.role === 'assistant' && m.id === messageId
      ? { ...m, isStreaming: false }
      : m,
  );
}
