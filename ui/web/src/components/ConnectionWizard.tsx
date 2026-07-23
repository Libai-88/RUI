import { useState } from 'react';
import type { AcpConnectionConfig } from '../product/types';
import { testConnection, type ConnectionTestResult } from '../connection/connectionTest';

/** 连接向导组件 */
export function ConnectionWizard({
  onConnected,
}: {
  onConnected: (config: AcpConnectionConfig) => void;
}) {
  const [endpoint, setEndpoint] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [workspace, setWorkspace] = useState('');
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<ConnectionTestResult | null>(null);
  const [connected, setConnected] = useState(false);

  async function handleTestConnection() {
    if (!endpoint.trim()) {
      setResult({ success: false, message: '请输入 ACP 地址', reason: 'unknown' });
      return;
    }

    setTesting(true);
    setResult(null);

    const config: AcpConnectionConfig = {
      endpoint: endpoint.trim(),
      secretKey: secretKey.trim() || undefined,
      workspace: workspace.trim(),
    };

    const testResult = await testConnection(config);
    setResult(testResult);
    setTesting(false);

    if (testResult.success) {
      setConnected(true);
      // 延迟一点让用户看到成功状态
      setTimeout(() => onConnected(config), 500);
    }
  }

  async function handleSaveAndConnect() {
    if (!endpoint.trim()) {
      setResult({ success: false, message: '请输入 ACP 地址', reason: 'unknown' });
      return;
    }

    const config: AcpConnectionConfig = {
      endpoint: endpoint.trim(),
      secretKey: secretKey.trim() || undefined,
      workspace: workspace.trim(),
    };

    onConnected(config);
  }

  function handleSkipTest() {
    if (!endpoint.trim()) return;
    handleSaveAndConnect();
  }

  return (
    <div style={{ maxWidth: 480, margin: '80px auto', padding: '0 24px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: 8 }}>RUI</h1>
      <p style={{ textAlign: 'center', color: '#666', marginBottom: 32 }}>
        连接到 Goose ACP 服务
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label htmlFor="endpoint" style={{ display: 'block', marginBottom: 4 }}>
            ACP 地址 <span style={{ color: '#e53e3e' }}>*</span>
          </label>
          <input
            id="endpoint"
            type="text"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="http://127.0.0.1:3000"
            style={inputStyle}
            disabled={connected}
          />
        </div>

        <div>
          <label htmlFor="secretKey" style={{ display: 'block', marginBottom: 4 }}>
            Secret Key（可选）
          </label>
          <input
            id="secretKey"
            type="password"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            placeholder="留空表示无认证"
            style={inputStyle}
            disabled={connected}
          />
        </div>

        <div>
          <label htmlFor="workspace" style={{ display: 'block', marginBottom: 4 }}>
            工作目录 <span style={{ color: '#e53e3e' }}>*</span>
          </label>
          <input
            id="workspace"
            type="text"
            value={workspace}
            onChange={(e) => setWorkspace(e.target.value)}
            placeholder="D:\Rui\project"
            style={inputStyle}
            disabled={connected}
          />
        </div>

        {result && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 4,
              fontSize: 14,
              background: result.success ? '#f0fff4' : '#fff5f5',
              color: result.success ? '#2f855a' : '#c53030',
              border: `1px solid ${result.success ? '#9ae6b4' : '#feb2b2'}`,
            }}
          >
            {result.message}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing || connected || !endpoint.trim()}
            style={buttonStyle}
          >
            {testing ? '测试中…' : '测试连接'}
          </button>
          <button
            type="button"
            onClick={handleSkipTest}
            disabled={!endpoint.trim() || connected}
            style={{ ...buttonStyle, background: '#3182ce', color: '#fff' }}
          >
            直接连接
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 4,
  fontSize: 14,
  boxSizing: 'border-box',
};

const buttonStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 16px',
  border: '1px solid #d1d5db',
  borderRadius: 4,
  fontSize: 14,
  cursor: 'pointer',
  background: '#fff',
  color: '#333',
};
