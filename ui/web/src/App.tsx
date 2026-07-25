import { useState, useEffect, useMemo, useCallback } from 'react';
import type { AcpConnectionConfig, SessionId, PermissionRequest } from './product/types';
import { loadConnectionConfig, saveConnectionConfig } from './connection/connectionConfig';
import { ConnectionWizard } from './components/ConnectionWizard';
import { ChatView } from './components/ChatView';
import { SessionList } from './components/SessionList';
import { useSessionList } from './hooks/useSessionList';
import { WebAcpAdapter } from './acp/webAcpAdapter';
import { createGooseClientFactory } from './acp/gooseClientFactory';
import { ThreeColumnLayout } from './components/ThreeColumnLayout';
import { ContextArea } from './components/ContextArea';
import { t } from './product/i18n';
import { brand } from './product/brand';

type ConnectionState = 'connecting' | 'connected' | 'error';

/**
 * RUI Web 应用根组件
 *
 * 首次进入时显示连接向导，完成连接后显示主界面。
 */
export function App() {
  useEffect(() => {
    document.title = brand.name;
  }, []);

  const [config, setConfig] = useState<AcpConnectionConfig | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = loadConnectionConfig();
    setConfig(saved);
    setLoaded(true);
  }, []);

  function handleConnected(newConfig: AcpConnectionConfig) {
    saveConnectionConfig(newConfig);
    setConfig(newConfig);
  }

  if (!loaded) {
    return null;
  }

  if (!config) {
    return <ConnectionWizard onConnected={handleConnected} />;
  }

  return <ConnectedApp config={config} />;
}

function ConnectedApp({ config }: { config: AcpConnectionConfig }) {
  const adapter = useMemo(
    () => new WebAcpAdapter(createGooseClientFactory()),
    [],
  );
  const [connectionState, setConnectionState] =
    useState<ConnectionState>('connecting');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setConnectionState('connecting');
    adapter
      .connect(config)
      .then(() => {
        if (!cancelled) setConnectionState('connected');
      })
      .catch(() => {
        if (!cancelled) setConnectionState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [adapter, config, retryKey]);

  const sessionList = useSessionList(
    connectionState === 'connected' ? adapter : null,
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        handleCreateNew();
        document
          .querySelector<HTMLButtonElement>('[data-shortcut="new-session"]')
          ?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });
  const [forceNewSession, setForceNewSession] = useState(false);
  const [pendingPermissions, setPendingPermissions] = useState<PermissionRequest[]>([]);
  const [resolvePermission, setResolvePermission] = useState<(requestId: string, allowed: boolean, scope?: 'once' | 'always') => Promise<void>>(
    async () => {},
  );

  const handlePendingPermissionsChange = useCallback(
    (perms: PermissionRequest[], resolver: (requestId: string, allowed: boolean, scope?: 'once' | 'always') => Promise<void>) => {
      setPendingPermissions(perms);
      setResolvePermission(() => resolver);
    },
    [],
  );

  function handleCreateNew() {
    setForceNewSession(true);
    void sessionList.createNewSession();
  }

  function handleSelectSession(sessionId: SessionId) {
    setForceNewSession(false);
    void sessionList.selectSession(sessionId);
  }

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
      <header style={{ padding: '8px 16px', borderBottom: '1px solid #e5e7eb' }}>
        <strong>{t('header.title')}</strong>
        <span style={{ marginLeft: 12, color: '#666', fontSize: 14 }}>
          {config.endpoint}
        </span>
      </header>
      <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {connectionState === 'connecting' && <CenteredHint text={t('app.loading')} />}
        {connectionState === 'error' && (
          <ConnectionError onRetry={() => setRetryKey((k) => k + 1)} />
        )}
        {connectionState === 'connected' && (
          <ThreeColumnLayout
            left={
              <SessionList
                sessions={sessionList.sessions}
                activeSessionId={sessionList.activeSessionId}
                loadingSessionId={sessionList.loadingSessionId}
                loading={sessionList.loading}
                onSelect={handleSelectSession}
                onCreateNew={handleCreateNew}
                onRefresh={sessionList.refresh}
              />
            }
            center={
              <ChatView
                adapter={adapter}
                workspace={{ path: config.workspace }}
                sessionId={forceNewSession ? null : sessionList.activeSessionId}
                onSessionCreated={(id) => handleSelectSession(id)}
                onPendingPermissionsChange={handlePendingPermissionsChange}
              />
            }
            right={
              <ContextArea
                workspacePath={config.workspace}
                endpoint={config.endpoint}
                connectionState={connectionState}
                pendingPermissions={pendingPermissions}
                onRespondPermission={resolvePermission}
              />
            }
          />
        )}
      </main>
    </div>
  );
}

function CenteredHint({ text }: { text: string }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#666',
      }}
    >
      {text}
    </div>
  );
}

function ConnectionError({ onRetry }: { onRetry: () => void }) {
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
      <div>{t('connection.error.title')}</div>
      <button
        type="button"
        onClick={onRetry}
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
        {t('connection.error.retry')}
      </button>
    </div>
  );
}


