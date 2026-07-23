import type { SystemMessage } from '../../product/types';

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

export function SystemMessageView({ message }: { message: SystemMessage }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div style={systemBubbleStyle}>{message.content}</div>
    </div>
  );
}
