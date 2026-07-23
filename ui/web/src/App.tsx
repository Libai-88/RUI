import { useState, useEffect, useMemo } from 'react';
import type { AcpConnectionConfig } from './product/types';
import { loadConnectionConfig, saveConnectionConfig } from './connection/connectionConfig';
import { ConnectionWizard } from './components/ConnectionWizard';
import { ChatView } from './components/ChatView';
import { WebAcpAdapter } from './acp/webAcpAdapter';
import { createGooseClientFactory } from './acp/gooseClientFactory';

type ConnectionState = 'connecting' | 'connected' | 'error';

/**
 * RUI Web 应用根组件
 *
 * 首次进入时显示连接向导，完成连接后显示主界面。
 */
export function App() {
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

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
      <header style={{ padding: '8px 16px', borderBottom: '1px solid #e5e7eb' }}>
        <strong>RUI</strong>
        <span style={{ marginLeft: 12, color: '#666', fontSize: 14 }}>
          {config.endpoint}
        </span>
      </header>
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {connectionState === 'connecting' && <CenteredHint text="正在连接…" />}
        {connectionState === 'error' && (
          <ConnectionError onRetry={() => setRetryKey((k) => k + 1)} />
        )}
        {connectionState === 'connected' && (
          <ChatView adapter={adapter} workspace={{ path: config.workspace }} />
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
      <div>连接 ACP 服务失败</div>
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
        重试
      </button>
    </div>
  );
}
