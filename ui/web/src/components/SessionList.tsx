import type { SessionSummary, SessionId, SessionStatus } from '../product/types';

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString();
}

function StatusBadge({ status }: { status: SessionStatus }) {
  const { label, style } = statusConfig[status] ?? statusConfig.idle;
  return <span style={{ ...statusBadgeBaseStyle, ...style }}>{label}</span>;
}

const statusBadgeBaseStyle: React.CSSProperties = {
  fontSize: 10,
  padding: '1px 6px',
  borderRadius: 4,
  fontWeight: 500,
};

const statusConfig: Record<SessionStatus, { label: string; style: React.CSSProperties }> = {
  idle: { label: '空闲', style: { background: '#e5e7eb', color: '#4b5563' } },
  streaming: { label: '生成中', style: { background: '#dbeafe', color: '#1e40af' } },
  'waiting-for-permission': { label: '待权限', style: { background: '#fef3c7', color: '#92400e' } },
  cancelled: { label: '已取消', style: { background: '#f3f4f6', color: '#6b7280' } },
  error: { label: '错误', style: { background: '#fee2e2', color: '#991b1b' } },
  interrupted: { label: '已中断', style: { background: '#fef3c7', color: '#b45309' } },
};

export function SessionList({
  sessions,
  activeSessionId,
  loadingSessionId,
  loading,
  onSelect,
  onCreateNew,
  onRefresh,
}: {
  sessions: SessionSummary[];
  activeSessionId: SessionId | null;
  loadingSessionId: SessionId | null;
  loading: boolean;
  onSelect: (sessionId: SessionId) => void;
  onCreateNew: () => void;
  onRefresh: () => void;
}) {
  return (
    <aside
      style={{
        width: 240,
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          padding: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <button type="button" data-shortcut="new-session" onClick={onCreateNew} style={newSessionBtnStyle}>
          新建会话
        </button>
        <button type="button" onClick={onRefresh} style={refreshBtnStyle}>
          刷新
        </button>
        {loading && <div style={{ fontSize: 12, color: '#666' }}>加载中…</div>}
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {sessions.length === 0 ? (
          <div style={{ padding: '16px 12px', color: '#999', textAlign: 'center', fontSize: 13 }}>
            暂无会话
          </div>
        ) : (
          sessions.map((s) => {
            const isActive = s.id === activeSessionId;
            const isLoading = s.id === loadingSessionId;
            return (
              <div
                key={s.id}
                data-session-id={s.id}
                data-active={isActive ? 'true' : 'false'}
                onClick={() => onSelect(s.id)}
                style={itemStyle(isActive)}
              >
                <div style={titleStyle}>{s.title || '未命名会话'}</div>
                {s.description && <div style={descStyle}>{s.description}</div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={dateStyle}>{formatDate(s.updatedAt)}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <StatusBadge status={s.status} />
                    {isLoading && <span style={loadingTextStyle}>加载中…</span>}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

function itemStyle(isActive: boolean): React.CSSProperties {
  return {
    padding: '8px 12px',
    cursor: 'pointer',
    borderBottom: '1px solid #f1f3f5',
    background: isActive ? '#e3f2fd' : 'transparent',
    borderLeft: isActive ? '3px solid #3182ce' : '3px solid transparent',
  };
}

const newSessionBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #3182ce',
  borderRadius: 4,
  background: '#3182ce',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 14,
};

const refreshBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 4,
  background: '#fff',
  color: '#333',
  cursor: 'pointer',
  fontSize: 13,
};

const titleStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 13,
  color: '#222',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const descStyle: React.CSSProperties = {
  color: '#666',
  fontSize: 12,
  marginTop: 2,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const dateStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#999',
  marginTop: 4,
};

const loadingTextStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#3182ce',
  marginTop: 4,
};
