import { useEffect, useRef } from 'react';
import type { Message, AssistantMessage } from '../product/types';

const blinkingCursorStyle = `
@keyframes rui-blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
.rui-streaming-cursor {
  display: inline-block;
  margin-left: 2px;
  animation: rui-blink 1s steps(1) infinite;
}
`;

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
      <style>{blinkingCursorStyle}</style>
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  if (message.role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={userBubbleStyle}>{message.content}</div>
      </div>
    );
  }
  if (message.role === 'assistant') {
    return <AssistantBubble message={message} />;
  }
  if (message.role === 'tool') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <div style={systemBubbleStyle}>{message.toolInvocation.toolName}</div>
      </div>
    );
  }
  const content = 'content' in message ? message.content : '';
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div style={systemBubbleStyle}>{content}</div>
    </div>
  );
}

function AssistantBubble({ message }: { message: AssistantMessage }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div style={assistantBubbleStyle}>
        {message.content}
        {message.isStreaming && <span className="rui-streaming-cursor">▋</span>}
      </div>
    </div>
  );
}

const userBubbleStyle: React.CSSProperties = {
  maxWidth: '70%',
  padding: '8px 12px',
  borderRadius: '12px',
  background: '#3182ce',
  color: '#fff',
  fontSize: 14,
  lineHeight: 1.5,
  wordBreak: 'break-word',
  whiteSpace: 'pre-wrap',
};

const assistantBubbleStyle: React.CSSProperties = {
  maxWidth: '70%',
  padding: '8px 12px',
  borderRadius: '12px',
  background: '#f1f3f5',
  color: '#333',
  fontSize: 14,
  lineHeight: 1.5,
  wordBreak: 'break-word',
  whiteSpace: 'pre-wrap',
};

const systemBubbleStyle: React.CSSProperties = {
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
