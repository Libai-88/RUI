import type { Message, AssistantMessage, ThoughtMessage, MessageId, SessionId } from '../product/types';

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

/** 累积思考 chunk 到消息列表 */
export function accumulateThoughtChunk(
  messages: Message[],
  event: { sessionId: SessionId; messageId: MessageId; delta: string },
): Message[] {
  const existing = messages.find(
    (m): m is ThoughtMessage =>
      m.role === 'thought' && m.id === event.messageId,
  );
  if (existing) {
    return messages.map((m) =>
      m === existing
        ? { ...m, content: m.content + event.delta, isStreaming: true }
        : m,
    );
  }
  const newMessage: ThoughtMessage = {
    id: event.messageId,
    role: 'thought',
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

/** 标记思考消息为完成 */
export function finalizeThought(
  messages: Message[],
  messageId: MessageId,
): Message[] {
  return messages.map((m) =>
    m.role === 'thought' && m.id === messageId
      ? { ...m, isStreaming: false }
      : m,
  );
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
