import { useEffect, useState, type ReactNode } from 'react';
import { useViewportBreakpoint } from '../hooks/useViewportBreakpoint';

export interface ThreeColumnLayoutProps {
  left: ReactNode;
  center: ReactNode;
  right?: ReactNode;
}

function getCollapsedState(breakpoint: ReturnType<typeof useViewportBreakpoint>, hasRight: boolean) {
  return {
    left: breakpoint === 'narrow',
    right: hasRight && breakpoint !== 'wide',
  };
}

const layoutStyle: React.CSSProperties = {
  display: 'flex',
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
};

const panelStyle: React.CSSProperties = {
  minWidth: 0,
  overflow: 'auto',
};

const centerStyle: React.CSSProperties = {
  ...panelStyle,
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
};

const controlsStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  padding: '8px 12px',
  borderBottom: '1px solid #e5e7eb',
};

const buttonStyle: React.CSSProperties = {
  padding: '4px 8px',
  border: '1px solid #d1d5db',
  borderRadius: 4,
  background: '#fff',
  color: '#333',
  cursor: 'pointer',
  fontSize: 12,
};

export function ThreeColumnLayout({ left, center, right }: ThreeColumnLayoutProps) {
  const breakpoint = useViewportBreakpoint();
  const hasRight = right !== undefined;
  const [collapsed, setCollapsed] = useState(() => getCollapsedState(breakpoint, hasRight));

  useEffect(() => {
    setCollapsed(getCollapsedState(breakpoint, hasRight));
  }, [breakpoint, hasRight]);

  function toggleLeft() {
    setCollapsed((current) => ({ ...current, left: !current.left }));
  }

  function toggleRight() {
    setCollapsed((current) => ({ ...current, right: !current.right }));
  }

  return (
    <div style={layoutStyle} data-testid="three-column-layout" data-breakpoint={breakpoint}>
      {!collapsed.left && (
        <aside
          id="three-column-left-panel"
          style={{ ...panelStyle, width: 240, flexShrink: 0, borderRight: '1px solid #e5e7eb' }}
          aria-label="左侧栏"
          data-testid="left-panel"
        >
          {left}
        </aside>
      )}
      <section style={centerStyle} aria-label="中间栏" data-testid="center-panel">
        <div style={controlsStyle}>
          <button
            type="button"
            style={buttonStyle}
            onClick={toggleLeft}
            aria-expanded={!collapsed.left}
            aria-controls="three-column-left-panel"
          >
            {collapsed.left ? '展开左栏' : '收起左栏'}
          </button>
          {hasRight && (
            <button
              type="button"
              style={buttonStyle}
              onClick={toggleRight}
              aria-expanded={!collapsed.right}
              aria-controls="three-column-right-panel"
            >
              {collapsed.right ? '展开右栏' : '收起右栏'}
            </button>
          )}
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>{center}</div>
      </section>
      {hasRight && !collapsed.right && (
        <aside
          id="three-column-right-panel"
          style={{ ...panelStyle, width: 280, flexShrink: 0, borderLeft: '1px solid #e5e7eb' }}
          aria-label="右侧栏"
          data-testid="right-panel"
        >
          {right}
        </aside>
      )}
    </div>
  );
}