import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionList } from './SessionList';
import type { SessionSummary } from '../product/types';

const sessions: SessionSummary[] = [
  {
    id: 's1',
    title: '会话一',
    description: '摘要一',
    createdAt: '',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 's2',
    title: '会话二',
    description: '摘要二',
    createdAt: '',
    updatedAt: '2024-01-02T00:00:00Z',
  },
];

function renderList(overrides: Partial<React.ComponentProps<typeof SessionList>> = {}) {
  const onSelect = vi.fn();
  const onCreateNew = vi.fn();
  const onRefresh = vi.fn();
  const utils = render(
    <SessionList
      sessions={sessions}
      activeSessionId={null}
      loadingSessionId={null}
      loading={false}
      onSelect={onSelect}
      onCreateNew={onCreateNew}
      onRefresh={onRefresh}
      {...overrides}
    />,
  );
  return { ...utils, onSelect, onCreateNew, onRefresh };
}

describe('SessionList', () => {
  it('显示会话列表', () => {
    renderList();
    expect(screen.getByText('会话一')).toBeInTheDocument();
    expect(screen.getByText('会话二')).toBeInTheDocument();
  });

  it('空列表显示提示', () => {
    renderList({ sessions: [] });
    expect(screen.getByText('暂无会话')).toBeInTheDocument();
  });

  it('点击会话调用 onSelect', () => {
    const { onSelect } = renderList();
    fireEvent.click(screen.getByText('会话一'));
    expect(onSelect).toHaveBeenCalledWith('s1');
  });

  it('新建会话按钮调用 onCreateNew', () => {
    const { onCreateNew } = renderList();
    fireEvent.click(screen.getByText('新建会话'));
    expect(onCreateNew).toHaveBeenCalledTimes(1);
  });

  it('active session 高亮显示', () => {
    renderList({ activeSessionId: 's1' });
    const activeItem = document.querySelector('[data-active="true"]') as HTMLElement;
    expect(activeItem).not.toBeNull();
    expect(activeItem.getAttribute('data-session-id')).toBe('s1');
    expect(activeItem).toHaveStyle({ background: '#e3f2fd' });
  });

  it('加载中的会话显示加载提示', () => {
    renderList({ loadingSessionId: 's2' });
    const item = document.querySelector('[data-session-id="s2"]') as HTMLElement;
    expect(item).not.toBeNull();
    expect(item.textContent).toContain('加载中…');
  });

  it('加载状态显示加载指示', () => {
    renderList({ loading: true });
    expect(screen.getByText('加载中…')).toBeInTheDocument();
  });
});
