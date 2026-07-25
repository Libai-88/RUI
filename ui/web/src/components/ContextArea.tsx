import type { PermissionRequest } from '../product/types';

export interface ContextAreaProps {
  workspacePath: string;
  endpoint: string;
  connectionState: 'connecting' | 'connected' | 'error';
  providerLabel?: string;
  modelLabel?: string;
  pendingPermissions: PermissionRequest[];
  onRespondPermission: (
    requestId: string,
    allowed: boolean,
    scope?: 'once' | 'always',
  ) => Promise<void>;
}

const sectionStyle: React.CSSProperties = {
  padding: '0 12px',
};

const sectionHeaderStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 12,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 8,
};

const entryStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: 6,
};

const labelStyle: React.CSSProperties = {
  color: '#6b7280',
  fontSize: 12,
  flexShrink: 0,
};

const valueStyle: React.CSSProperties = {
  color: '#111827',
  fontSize: 13,
  textAlign: 'right',
  wordBreak: 'break-all',
  maxWidth: '60%',
};

const dividerStyle: React.CSSProperties = {
  height: 1,
  background: '#e5e7eb',
  margin: '12px 0',
};

const statusDot = (connected: boolean, connecting: boolean): React.CSSProperties => ({
  display: 'inline-block',
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: connected ? '#38a169' : connecting ? '#d69e2e' : '#e53e3e',
  marginRight: 6,
  flexShrink: 0,
  marginTop: 4,
});

const statusRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 6,
  marginBottom: 4,
};

const comingSoonBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  fontSize: 10,
  color: '#9ca3af',
  border: '1px solid #d1d5db',
  borderRadius: 3,
  padding: '0 4px',
  marginLeft: 6,
  lineHeight: '16px',
};

const comingSoonItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  fontSize: 13,
  color: '#6b7280',
  padding: '4px 0',
  cursor: 'not-allowed',
};

const clickableEntryStyle: React.CSSProperties = {
  cursor: 'pointer',
  color: '#2563eb',
  fontSize: 13,
};

export function ContextArea({
  workspacePath,
  endpoint,
  connectionState,
  providerLabel,
  modelLabel,
  pendingPermissions,
  onRespondPermission,
}: ContextAreaProps) {
  const isConnecting = connectionState === 'connecting';
  const isConnected = connectionState === 'connected';
  const isError = connectionState === 'error';

  const statusText = isConnecting
    ? '连接中…'
    : isError
      ? '连接失败'
      : '已连接';

  return (
    <div
      style={{
        padding: '12px 0',
        overflowY: 'auto',
        height: '100%',
        fontSize: 13,
      }}
      data-testid="context-area"
    >
      {/* Workspace */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>工作区</div>
        <div style={entryStyle}>
          <span style={labelStyle}>路径</span>
          <span style={valueStyle} title={workspacePath} data-testid="context-workspace-path">
            {workspacePath}
          </span>
        </div>
      </div>

      <div style={dividerStyle} />

      {/* Provider */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>Provider</div>
        <div style={entryStyle}>
          <span style={labelStyle}>Provider</span>
          <span style={valueStyle} data-testid="context-provider-name">
            {providerLabel ?? '待获取'}
          </span>
        </div>
        <div style={entryStyle}>
          <span style={labelStyle}>模型</span>
          <span style={valueStyle} data-testid="context-model-name">
            {modelLabel ?? '待获取'}
          </span>
        </div>
        <div style={{ ...entryStyle, cursor: 'not-allowed', opacity: 0.6 }}>
          <div>
            <span style={clickableEntryStyle}>配置编辑</span>
            <span style={comingSoonBadgeStyle}>即将推出</span>
          </div>
        </div>
      </div>

      <div style={dividerStyle} />

      {/* 连接状态 */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>连接状态</div>
        <div style={statusRowStyle}>
          <span style={statusDot(isConnected, isConnecting)} />
          <span>
            <span data-testid="context-connection-state">{statusText}</span>
            <span
              style={{ color: '#9ca3af', fontSize: 12, marginLeft: 4 }}
            >
              {endpoint}
            </span>
          </span>
        </div>
      </div>

      <div style={dividerStyle} />

      {/* 待处理权限 */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          待处理权限
          {pendingPermissions.length > 0 && (
            <span
              style={{
                marginLeft: 6,
                background: '#92400e',
                color: '#fff',
                borderRadius: 10,
                padding: '0 6px',
                fontSize: 11,
                lineHeight: '16px',
              }}
            >
              {pendingPermissions.length}
            </span>
          )}
        </div>
        {pendingPermissions.length === 0 ? (
          <div
            style={{ color: '#9ca3af', fontSize: 12, padding: '4px 0' }}
            data-testid="context-no-permissions"
          >
            无待处理权限
          </div>
        ) : (
          <div>
            {pendingPermissions.map((request) => (
              <div
                key={request.id}
                style={{
                  padding: '6px 0',
                  borderBottom: '1px solid #f3f4f6',
                }}
                data-testid="context-permission-item"
              >
                <div
                  style={{ fontWeight: 600, fontSize: 12, marginBottom: 2 }}
                >
                  {request.toolName}
                </div>
                {request.description && (
                  <div
                    style={{
                      color: '#6b7280',
                      fontSize: 11,
                      marginBottom: 4,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {request.description}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() =>
                      onRespondPermission(request.id, true, 'once')
                    }
                    style={{
                      ...permBtnStyle,
                      background: '#38a169',
                      color: '#fff',
                    }}
                  >
                    允许
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onRespondPermission(request.id, true, 'always')
                    }
                    style={{
                      ...permBtnStyle,
                      background: '#2b6cb0',
                      color: '#fff',
                    }}
                  >
                    始终允许
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onRespondPermission(request.id, false, 'once')
                    }
                    style={{
                      ...permBtnStyle,
                      background: '#fff',
                      color: '#e53e3e',
                      border: '1px solid #e53e3e',
                    }}
                  >
                    拒绝
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onRespondPermission(request.id, false, 'always')
                    }
                    style={{
                      ...permBtnStyle,
                      background: '#fff',
                      color: '#c53030',
                      border: '1px solid #c53030',
                    }}
                  >
                    始终拒绝
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={dividerStyle} />

      {/* 即将推出 */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>扩展</div>
        <div style={comingSoonItemStyle}>
          MCP 扩展<span style={comingSoonBadgeStyle}>即将推出</span>
        </div>
        <div style={comingSoonItemStyle}>
          Recipe<span style={comingSoonBadgeStyle}>即将推出</span>
        </div>
      </div>
    </div>
  );
}

const permBtnStyle: React.CSSProperties = {
  border: 'none',
  borderRadius: 3,
  fontSize: 11,
  padding: '2px 8px',
  cursor: 'pointer',
};
