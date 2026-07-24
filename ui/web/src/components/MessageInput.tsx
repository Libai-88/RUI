import { useState, type KeyboardEvent } from 'react';
import type { SessionStatus } from '../product/types';

export function MessageInput({
  status,
  onSend,
  onCancel,
}: {
  status: SessionStatus;
  onSend: (content: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState('');
  const isStreaming = status === 'streaming';
  const canSend = text.trim().length > 0;

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Escape' && isStreaming) {
      e.preventDefault();
      onCancel();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSend() {
    if (!canSend || isStreaming) return;
    const value = text;
    setText('');
    onSend(value);
  }

  function handleCancel() {
    onCancel();
  }

  return (
    <div
      style={{
        borderTop: '1px solid #e5e7eb',
        padding: '12px 16px',
        display: 'flex',
        gap: '8px',
        alignItems: 'flex-end',
      }}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入消息，Enter 发送，Shift+Enter 换行"
        style={{
          flex: 1,
          padding: '8px 12px',
          border: '1px solid #d1d5db',
          borderRadius: 4,
          fontSize: 14,
          lineHeight: 1.5,
          resize: 'none',
          minHeight: 40,
          maxHeight: 160,
          boxSizing: 'border-box',
          fontFamily: 'inherit',
        }}
        rows={1}
      />
      {isStreaming ? (
        <button
          type="button"
          onClick={handleCancel}
          style={{ ...buttonStyle, background: '#e53e3e', color: '#fff' }}
        >
          取消
        </button>
      ) : (
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          style={{
            ...buttonStyle,
            background: canSend ? '#3182ce' : '#a0aec0',
            color: '#fff',
            cursor: canSend ? 'pointer' : 'not-allowed',
          }}
        >
          发送
        </button>
      )}
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: '8px 16px',
  border: '1px solid transparent',
  borderRadius: 4,
  fontSize: 14,
  cursor: 'pointer',
  minWidth: 64,
};
