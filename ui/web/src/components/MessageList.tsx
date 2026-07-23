import { useEffect, useRef } from 'react';
import type { Message } from '../product/types';
import { AssistantMessageView } from './messages/AssistantMessageView';
import { UserMessageView } from './messages/UserMessageView';
import { SystemMessageView } from './messages/SystemMessageView';
import { ErrorMessageView } from './messages/ErrorMessageView';
import { ToolInvocationCard } from './messages/ToolInvocationCard';

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
      return <ToolInvocationCard message={message} />;
    default:
      return null;
  }
}
