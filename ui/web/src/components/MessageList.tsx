import { useEffect, useRef } from 'react';
import type { Message, ToolMessage } from '../product/types';
import { AssistantMessageView } from './messages/AssistantMessageView';
import { UserMessageView } from './messages/UserMessageView';
import { SystemMessageView } from './messages/SystemMessageView';
import { ErrorMessageView } from './messages/ErrorMessageView';

export function MessageList({ messages }: { messages: Message[] }) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = bottomRef.current;
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  switch (message.role) {
    case 'user':
      return <UserMessageView message={message} />;
    case 'assistant':
      return <AssistantMessageView message={message} />;
    case 'system':
      return <SystemMessageView message={message} />;
    case 'error':
      return <ErrorMessageView message={message} />;
    case 'tool':
      return <ToolMessagePlaceholder message={message} />;
    default:
      return null;
  }
}

const toolBubbleStyle: React.CSSProperties = {
  maxWidth: '70%',
  padding: '8px 12px',
  borderRadius: '12px',
  background: '#fff5f5',
  color: '#c53030',
  fontSize: 14,
  lineHeight: 1.5,
  wordBreak: 'break-word',
  whiteSpace: 'pre-wrap',
};

function ToolMessagePlaceholder({ message }: { message: ToolMessage }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div style={toolBubbleStyle}>{message.toolInvocation.toolName}</div>
    </div>
  );
}
