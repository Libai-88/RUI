import type { UserMessage } from '../../product/types';

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

export function UserMessageView({ message }: { message: UserMessage }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={userBubbleStyle}>{message.content}</div>
    </div>
  );
}
