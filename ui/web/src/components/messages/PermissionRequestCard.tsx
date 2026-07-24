import type { PermissionMessage } from '../../product/types';

const STATUS_LABEL: Record<PermissionMessage['request']['status'], string> = {
  pending: '待处理',
  allowed: '已允许',
  denied: '已拒绝',
};

const STATUS_COLOR: Record<PermissionMessage['request']['status'], string> = {
  pending: '#d97706',
  allowed: '#38a169',
  denied: '#e53e3e',
};

const cardStyle = (status: PermissionMessage['request']['status']): React.CSSProperties => ({
  maxWidth: '70%',
  padding: '10px 14px',
  borderRadius: '8px',
  background: '#fffbeb',
  borderLeft: `4px solid ${STATUS_COLOR[status]}`,
  color: '#333',
  fontSize: 14,
  lineHeight: 1.5,
  wordBreak: 'break-word',
});

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '4px',
};

const titleStyle: React.CSSProperties = {
  fontWeight: 600,
  color: '#1a202c',
};

const statusBadgeStyle = (status: PermissionMessage['request']['status']): React.CSSProperties => ({
  fontSize: 12,
  fontWeight: 600,
  color: STATUS_COLOR[status],
  whiteSpace: 'nowrap',
});

const descriptionStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#4a5568',
  marginBottom: '8px',
  whiteSpace: 'pre-wrap',
};

const actionsRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
};

const btnBaseStyle: React.CSSProperties = {
  border: 'none',
  borderRadius: 4,
  fontSize: 13,
  padding: '4px 12px',
  cursor: 'pointer',
};

const allowBtnStyle: React.CSSProperties = {
  ...btnBaseStyle,
  background: '#38a169',
  color: '#fff',
};

const denyBtnStyle: React.CSSProperties = {
  ...btnBaseStyle,
  background: '#fff',
  color: '#e53e3e',
  border: '1px solid #e53e3e',
};

const alwaysBtnStyle: React.CSSProperties = {
  ...btnBaseStyle,
  background: '#2b6cb0',
  color: '#fff',
};

export function PermissionRequestCard({
  message,
  onRespond,
}: {
  message: PermissionMessage;
  onRespond: (requestId: string, allowed: boolean, scope?: 'once' | 'always') => void;
}) {
  const { request } = message;
  const isPending = request.status === 'pending';

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div style={cardStyle(request.status)} data-testid="permission-card">
        <div style={headerStyle}>
          <span style={titleStyle} data-testid="permission-tool-name">
            权限请求：{request.toolName}
          </span>
          <span style={statusBadgeStyle(request.status)} data-testid="permission-status">
            {STATUS_LABEL[request.status]}
          </span>
        </div>
        {request.description && (
          <div style={descriptionStyle} data-testid="permission-description">
            {request.description}
          </div>
        )}
        {isPending && (
          <div style={actionsRowStyle}>
            <button
              type="button"
              style={allowBtnStyle}
              onClick={() => onRespond(request.id, true, 'once')}
              data-testid="permission-allow-btn"
            >
              允许
            </button>
            <button
              type="button"
              style={alwaysBtnStyle}
              onClick={() => onRespond(request.id, true, 'always')}
              data-testid="permission-allow-always-btn"
            >
              始终允许
            </button>
            <button
              type="button"
              style={denyBtnStyle}
              onClick={() => onRespond(request.id, false, 'once')}
              data-testid="permission-deny-btn"
            >
              拒绝
            </button>
            <button
              type="button"
              style={{ ...denyBtnStyle, color: '#c53030', borderColor: '#c53030' }}
              onClick={() => onRespond(request.id, false, 'always')}
              data-testid="permission-deny-always-btn"
            >
              始终拒绝
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
