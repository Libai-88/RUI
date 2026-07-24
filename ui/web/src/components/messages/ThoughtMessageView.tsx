import { useState } from 'react';
import type { ThoughtMessage } from '../../product/types';

const containerStyle: React.CSSProperties = {
  maxWidth: '70%',
  padding: '8px 12px',
  borderRadius: '12px',
  background: '#f0f4ff',
  color: '#4a5568',
  fontSize: 13,
  lineHeight: 1.5,
  wordBreak: 'break-word',
  borderLeft: '3px solid #90cdf4',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  marginBottom: 4,
  cursor: 'pointer',
  userSelect: 'none',
};

const toggleBtnStyle: React.CSSProperties = {
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  fontSize: 12,
  color: '#3182ce',
  padding: 0,
};

export function ThoughtMessageView({ message }: { message: ThoughtMessage }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div style={containerStyle} data-testid="thought-message">
        <div style={headerStyle} onClick={() => setExpanded((v) => !v)}>
          <span style={{ fontWeight: 600, color: '#2b6cb0', fontSize: 12 }}>
            AI 思考中
          </span>
          <button type="button" style={toggleBtnStyle} aria-expanded={expanded}>
            {expanded ? '收起' : '展开'}
          </button>
        </div>
        {expanded && (
          <div data-testid="thought-content">
            {message.content}
            {message.isStreaming && <span className="rui-streaming-cursor">▋</span>}
          </div>
        )}
      </div>
    </div>
  );
}