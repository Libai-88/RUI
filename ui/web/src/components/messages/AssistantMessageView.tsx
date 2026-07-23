import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { AssistantMessage } from '../../product/types';

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

const containerStyle: React.CSSProperties = {
  maxWidth: '70%',
  padding: '8px 12px',
  borderRadius: '12px',
  background: '#f1f3f5',
  color: '#333',
  fontSize: 14,
  lineHeight: 1.5,
  wordBreak: 'break-word',
};

const inlineCodeStyle: React.CSSProperties = {
  background: '#e4e7eb',
  padding: '0 2px',
  borderRadius: '3px',
  fontFamily: 'monospace',
};

export function AssistantMessageView({ message }: { message: AssistantMessage }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <style>{blinkingCursorStyle}</style>
      <div style={containerStyle}>
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={{
            pre: ({ children }) => <>{children}</>,
            code: ({ className, children }) => {
              const match = /language-(\w+)/.exec(className || '');
              if (match) {
                return (
                  <SyntaxHighlighter language={match[1]} style={oneDark} PreTag="div">
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                );
              }
              return <code style={inlineCodeStyle}>{children}</code>;
            },
          }}
        >
          {message.content}
        </Markdown>
        {message.isStreaming && <span className="rui-streaming-cursor">▋</span>}
      </div>
    </div>
  );
}
