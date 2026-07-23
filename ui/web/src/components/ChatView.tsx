import { useEffect, useState } from 'react';
import type { AcpAdapter, Workspace, SessionId } from '../product/types';
import { useChat } from '../hooks/useChat';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

export function ChatView({
  adapter,
  workspace,
}: {
  adapter: AcpAdapter;
  workspace: Workspace;
}) {
  const [sessionId, setSessionId] = useState<SessionId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    adapter
      .createSession(workspace)
      .then((id) => {
        if (cancelled) return;
        setSessionId(id);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : '未知错误';
        setError(message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [adapter, workspace]);

  function handleRetry() {
    setLoading(true);
    setError(null);
    adapter
      .createSession(workspace)
      .then((id) => {
        setSessionId(id);
        setLoading(false);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : '未知错误';
        setError(message);
        setLoading(false);
      });
  }

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
        正在创建会话…
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          color: '#c53030',
        }}
      >
        <div>会话创建失败：{error}</div>
        <button
          type="button"
          onClick={handleRetry}
          style={{
            padding: '6px 16px',
            border: '1px solid #c53030',
            borderRadius: 4,
            background: '#fff',
            color: '#c53030',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          重试
        </button>
      </div>
    );
  }

  if (!sessionId) return null;

  return <ChatSession adapter={adapter} sessionId={sessionId} workspace={workspace} />;
}

function ChatSession({
  adapter,
  sessionId,
  workspace,
}: {
  adapter: AcpAdapter;
  sessionId: SessionId;
  workspace: Workspace;
}) {
  const { messages, status, sendMessage, cancel } = useChat(adapter, sessionId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          padding: '8px 16px',
          borderBottom: '1px solid #e5e7eb',
          fontSize: 13,
          color: '#666',
        }}
      >
        工作目录：{workspace.path}
      </div>
      <MessageList messages={messages} />
      <MessageInput status={status} onSend={sendMessage} onCancel={cancel} />
    </div>
  );
}
