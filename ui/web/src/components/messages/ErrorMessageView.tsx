import type { ErrorMessage } from '../../product/types';

const errorBubbleStyle: React.CSSProperties = {
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

const codeLabelStyle: React.CSSProperties = {
  fontWeight: 600,
  marginBottom: 4,
};

export function ErrorMessageView({ message }: { message: ErrorMessage }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div style={errorBubbleStyle}>
        {message.code && <div style={codeLabelStyle}>错误码：{message.code}</div>}
        <div>{message.content}</div>
      </div>
    </div>
  );
}
