import { useState } from 'react';
import type { ToolMessage } from '../../product/types';

const STATUS_COLOR: Record<ToolMessage['toolInvocation']['status'], string> = {
  'in-progress': '#3182ce',
  completed: '#38a169',
  failed: '#e53e3e',
};

const STATUS_LABEL: Record<ToolMessage['toolInvocation']['status'], string> = {
  'in-progress': '执行中…',
  completed: '已完成',
  failed: '已失败',
};

const STATUS_ICON: Record<ToolMessage['toolInvocation']['status'], string> = {
  'in-progress': '⟳',
  completed: '✓',
  failed: '✕',
};

const cardStyle = (status: ToolMessage['toolInvocation']['status']): React.CSSProperties => ({
  maxWidth: '70%',
  padding: '8px 12px',
  borderRadius: '8px',
  background: status === 'failed' ? '#fff5f5' : '#f8f9fa',
  borderLeft: `4px solid ${STATUS_COLOR[status]}`,
  color: '#333',
  fontSize: 14,
  lineHeight: 1.5,
  wordBreak: 'break-word',
});

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '4px',
};

const toolNameStyle: React.CSSProperties = {
  fontWeight: 600,
  color: '#1a202c',
};

const statusBadgeStyle = (status: ToolMessage['toolInvocation']['status']): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  fontSize: 12,
  color: STATUS_COLOR[status],
  whiteSpace: 'nowrap',
  fontWeight: 600,
});

const statusDotStyle = (status: ToolMessage['toolInvocation']['status']): React.CSSProperties => ({
  display: 'inline-block',
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: STATUS_COLOR[status],
});

const argsLabelStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#666',
  marginBottom: '2px',
};

const argsStyle: React.CSSProperties = {
  margin: 0,
  padding: '4px 6px',
  background: '#e4e7eb',
  borderRadius: '4px',
  fontFamily: 'monospace',
  fontSize: 12,
  color: '#333',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  display: '-webkit-box',
  WebkitLineClamp: 3,
  WebkitBoxOrient: 'vertical',
};

const resultHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: '6px',
  marginBottom: '2px',
};

const resultLabelStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#666',
};

const toggleBtnStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: '#3182ce',
  cursor: 'pointer',
  fontSize: 12,
  padding: 0,
};

const resultStyle = (isError: boolean, expanded: boolean): React.CSSProperties => ({
  margin: 0,
  padding: '4px 6px',
  background: isError ? '#fed7d7' : '#e4e7eb',
  borderRadius: '4px',
  fontFamily: 'monospace',
  fontSize: 12,
  color: isError ? '#c53030' : '#333',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
  maxHeight: expanded ? 'none' : '80px',
  overflowY: expanded ? 'visible' : 'hidden',
});

export function ToolInvocationCard({ message }: { message: ToolMessage }) {
  const { toolInvocation } = message;
  const { status, result } = toolInvocation;
  const label = STATUS_LABEL[status];
  const [expanded, setExpanded] = useState(false);
  const canToggle = Boolean(result && result.content.length > 120);

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div style={cardStyle(status)} data-testid="tool-card">
        <div style={headerStyle}>
          <span style={toolNameStyle} data-testid="tool-name">
            {toolInvocation.toolName}
          </span>
          <span style={statusBadgeStyle(status)} data-testid="status-badge">
            <span style={statusDotStyle(status)} data-testid="status-indicator" />
            <span data-testid="status-icon">{STATUS_ICON[status]}</span>
            <span data-testid="status-label">{label}</span>
          </span>
        </div>
        {toolInvocation.argumentsSummary && (
          <>
            <div style={argsLabelStyle}>参数</div>
            <code style={argsStyle} data-testid="tool-arguments">
              {toolInvocation.argumentsSummary}
            </code>
          </>
        )}
        {result && (
          <>
            <div style={resultHeaderStyle}>
              <div style={resultLabelStyle} data-testid="result-label">
                {result.isError ? '错误' : '结果'}
              </div>
              {canToggle && (
                <button
                  type="button"
                  style={toggleBtnStyle}
                  onClick={() => setExpanded((v) => !v)}
                  data-testid="result-toggle"
                >
                  {expanded ? '收起' : '展开'}
                </button>
              )}
            </div>
            <pre style={resultStyle(result.isError, expanded)} data-testid="tool-result">
              {result.content}
            </pre>
          </>
        )}
      </div>
    </div>
  );
}
