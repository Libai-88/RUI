import type { Message, AssistantMessage, MessageId, SessionId } from '../product/types';

/** 累积流式 chunk 到消息列表 */
export function accumulateChunk(
  messages: Message[],
  event: { sessionId: SessionId; messageId: MessageId; delta: string },
): Message[] {
  const existing = messages.find(
    (m): m is AssistantMessage =>
      m.role === 'assistant' && m.id === event.messageId,
  );
  if (existing) {
    return messages.map((m) =>
      m === existing
        ? { ...m, content: m.content + event.delta, isStreaming: true }
        : m,
    );
  }
  const newMessage: AssistantMessage = {
    id: event.messageId,
    role: 'assistant',
    content: event.delta,
    isStreaming: true,
    createdAt: new Date().toISOString(),
  };
  return [...messages, newMessage];
}

/** 标记流式消息为完成 */
export function finalizeMessage(
  messages: Message[],
  messageId: MessageId,
): Message[] {
  return messages.map((m) =>
    m.role === 'assistant' && m.id === messageId
      ? { ...m, isStreaming: false }
      : m,
  );
}
