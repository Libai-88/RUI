import { useState } from 'react';
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
  position: 'relative',
};

const inlineCodeStyle: React.CSSProperties = {
  background: '#e4e7eb',
  padding: '0 2px',
  borderRadius: '3px',
  fontFamily: 'monospace',
};

const codeBlockWrapStyle: React.CSSProperties = {
  position: 'relative',
  margin: '8px 0',
};

const copyBtnStyle: React.CSSProperties = {
  position: 'absolute',
  top: 8,
  right: 8,
  zIndex: 1,
  border: '1px solid #4a5568',
  borderRadius: 4,
  background: '#2d3748',
  color: '#e2e8f0',
  fontSize: 12,
  padding: '2px 8px',
  cursor: 'pointer',
};

const messageCopyBtnStyle: React.CSSProperties = {
  position: 'absolute',
  top: 6,
  right: 6,
  border: '1px solid #cbd5e0',
  borderRadius: 4,
  background: '#fff',
  color: '#4a5568',
  fontSize: 12,
  padding: '2px 8px',
  cursor: 'pointer',
  opacity: 0.85,
};

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const ok = await copyText(code);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <div style={codeBlockWrapStyle} data-testid="code-block">
      <button
        type="button"
        style={copyBtnStyle}
        onClick={handleCopy}
        data-testid="code-copy-btn"
      >
        {copied ? '已复制' : '复制'}
      </button>
      <SyntaxHighlighter language={language} style={oneDark} PreTag="div">
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

export function AssistantMessageView({ message }: { message: AssistantMessage }) {
  const [copied, setCopied] = useState(false);

  async function handleCopyMessage() {
    const ok = await copyText(message.content);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <style>{blinkingCursorStyle}</style>
      <div style={containerStyle} data-testid="assistant-message">
        {!message.isStreaming && message.content && (
          <button
            type="button"
            style={messageCopyBtnStyle}
            onClick={handleCopyMessage}
            data-testid="message-copy-btn"
          >
            {copied ? '已复制' : '复制'}
          </button>
        )}
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={{
            pre: ({ children }) => <>{children}</>,
            code: ({ className, children }) => {
              const match = /language-(\w+)/.exec(className || '');
              if (match) {
                return (
                  <CodeBlock
                    language={match[1]}
                    code={String(children).replace(/\n$/, '')}
                  />
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
