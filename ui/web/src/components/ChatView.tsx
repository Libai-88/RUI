import { useEffect, useState } from 'react';
import type { AcpAdapter, Workspace, SessionId, PermissionRequest } from '../product/types';
import { useChat } from '../hooks/useChat';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

export function ChatView({
  adapter,
  workspace,
  sessionId: providedSessionId,
  onSessionCreated,
  onPendingPermissionsChange,
}: {
  adapter: AcpAdapter;
  workspace: Workspace;
  sessionId?: SessionId | null;
  onSessionCreated?: (sessionId: SessionId) => void;
  onPendingPermissionsChange?: (pendingPermissions: PermissionRequest[], resolvePermission: (requestId: string, allowed: boolean, scope?: 'once' | 'always') => Promise<void>) => void;
}) {
  const [sessionId, setSessionId] = useState<SessionId | null>(providedSessionId ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!providedSessionId);

  useEffect(() => {
    if (providedSessionId !== undefined) {
      setSessionId(providedSessionId);
      setLoading(false);
      setError(null);
    } else {
      setSessionId(null);
      setLoading(true);
    }
  }, [providedSessionId]);

  useEffect(() => {
    if (providedSessionId !== undefined && providedSessionId !== null) return;
    if (sessionId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    adapter
      .createSession(workspace)
      .then((id) => {
        if (cancelled) return;
        setSessionId(id);
        setLoading(false);
        onSessionCreated?.(id);
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
  }, [adapter, workspace, providedSessionId, sessionId, onSessionCreated]);

  function handleRetry() {
    setLoading(true);
    setError(null);
    adapter
      .createSession(workspace)
      .then((id) => {
        setSessionId(id);
        setLoading(false);
        onSessionCreated?.(id);
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

  return (
    <ChatSession key={sessionId} adapter={adapter} sessionId={sessionId} workspace={workspace} onPendingPermissionsChange={onPendingPermissionsChange} />
  );
}

function ChatSession({
  adapter,
  sessionId,
  workspace,
  onPendingPermissionsChange,
}: {
  adapter: AcpAdapter;
  sessionId: SessionId;
  workspace: Workspace;
  onPendingPermissionsChange?: (pendingPermissions: PermissionRequest[], resolvePermission: (requestId: string, allowed: boolean, scope?: 'once' | 'always') => Promise<void>) => void;
}) {
  const {
    messages,
    status,
    sendMessage,
    cancel,
    reconnect,
    resendLastMessage,
    resolvePermission,
    pendingPermissions,
  } = useChat(adapter, sessionId);

  useEffect(() => {
    if (onPendingPermissionsChange) onPendingPermissionsChange(pendingPermissions, resolvePermission);
  }, [pendingPermissions, resolvePermission, onPendingPermissionsChange]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && (status === 'streaming' || status === 'waiting-for-permission')) {
        e.preventDefault();
        void cancel();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, cancel]);

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
      <div style={{ flex: 1, overflow: 'auto' }}>
        <MessageList messages={messages} onRespondPermission={resolvePermission} />
      </div>
      {status === 'interrupted' && (
        <div style={recoveryBarStyle}>
          <span style={{ fontSize: 13 }}>连接已中断，已接收内容已保留</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={continueFromBreakpoint}
              style={continueFromBreakpointBtnStyle}
            >
              从断点继续
            </button>
            <button
              type="button"
              onClick={reconnect}
              disabled={!adapter.reconnect}
              style={reconnectBtnStyle}
            >
              重连
            </button>
            <button
              type="button"
              onClick={resendLastMessage}
              style={resendBtnStyle}
            >
              重新发送
            </button>
          </div>
        </div>
      )}
      <MessageInput status={status} onSend={sendMessage} onCancel={cancel} />
    </div>
  );
}

const recoveryBarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 16px',
  borderTop: '1px solid #f59e0b',
  background: '#fffbeb',
  color: '#92400e',
  gap: 8,
};

const reconnectBtnStyle: React.CSSProperties = {
  padding: '4px 12px',
  border: '1px solid #d97706',
  borderRadius: 4,
  background: '#fff',
  color: '#b45309',
  cursor: 'pointer',
  fontSize: 13,
};

const resendBtnStyle: React.CSSProperties = {
  padding: '4px 12px',
  border: '1px solid #3182ce',
  borderRadius: 4,
  background: '#3182ce',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 13,
};
