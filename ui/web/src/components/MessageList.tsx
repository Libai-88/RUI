import { useCallback, useEffect, useRef, useState } from 'react';
import type { Message } from '../product/types';
import { AssistantMessageView } from './messages/AssistantMessageView';
import { UserMessageView } from './messages/UserMessageView';
import { SystemMessageView } from './messages/SystemMessageView';
import { ErrorMessageView } from './messages/ErrorMessageView';
import { ToolInvocationCard } from './messages/ToolInvocationCard';
import { PermissionRequestCard } from './messages/PermissionRequestCard';
import { ThoughtMessageView } from './messages/ThoughtMessageView';

const NEAR_BOTTOM_PX = 48;

export function MessageList({
  messages,
  onRespondPermission,
}: {
  messages: Message[];
  onRespondPermission?: (requestId: string, allowed: boolean, scope?: 'once' | 'always') => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [stickToBottom, setStickToBottom] = useState(true);
  const [showJump, setShowJump] = useState(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = bottomRef.current;
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior });
    }
    setStickToBottom(true);
    setShowJump(false);
  }, []);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distance <= NEAR_BOTTOM_PX;
    setStickToBottom(nearBottom);
    setShowJump(!nearBottom);
  }, []);

  useEffect(() => {
    if (!stickToBottom) return;
    scrollToBottom('smooth');
  }, [messages, stickToBottom, scrollToBottom]);

  return (
    <div style={{ flex: 1, position: 'relative', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        data-testid="message-list"
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
          <MessageBubble key={m.id} message={m} onRespondPermission={onRespondPermission} />
        ))}
        <div ref={bottomRef} data-testid="message-list-bottom" />
      </div>
      {showJump && (
        <button
          type="button"
          onClick={() => scrollToBottom('smooth')}
          data-testid="jump-to-bottom"
          style={jumpBtnStyle}
        >
          回到底部
        </button>
      )}
    </div>
  );
}

function MessageBubble({
  message,
  onRespondPermission,
}: {
  message: Message;
  onRespondPermission?: (requestId: string, allowed: boolean, scope?: 'once' | 'always') => void;
}) {
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
    case 'permission':
      return (
        <PermissionRequestCard
          message={message}
          onRespond={(requestId, allowed, scope) =>
            onRespondPermission?.(requestId, allowed, scope)
          }
        />
      );
    case 'thought':
      return <ThoughtMessageView message={message} />;
    default:
      return null;
  }
}

const jumpBtnStyle: React.CSSProperties = {
  position: 'absolute',
  right: 16,
  bottom: 16,
  border: '1px solid #cbd5e0',
  borderRadius: 16,
  background: '#fff',
  color: '#2d3748',
  fontSize: 13,
  padding: '6px 12px',
  cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
};
