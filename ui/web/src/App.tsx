import { useState, useEffect } from 'react';
import type { AcpConnectionConfig } from './product/types';
import { loadConnectionConfig, saveConnectionConfig } from './connection/connectionConfig';
import { ConnectionWizard } from './components/ConnectionWizard';

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

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
      <header style={{ padding: '8px 16px', borderBottom: '1px solid #e5e7eb' }}>
        <strong>RUI</strong>
        <span style={{ marginLeft: 12, color: '#666', fontSize: 14 }}>
          {config.endpoint}
        </span>
      </header>
      <main style={{ flex: 1, padding: 16, color: '#666' }}>
        <p>已连接到 ACP 服务。工作台正在准备中…</p>
        <p style={{ fontSize: 14 }}>工作目录：{config.workspace || '未设置'}</p>
      </main>
    </div>
  );
}
