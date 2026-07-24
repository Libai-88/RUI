import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PermissionRequestCard } from './PermissionRequestCard';
import type { PermissionMessage, PermissionRequest } from '../../product/types';

function makeMessage(overrides: Partial<PermissionRequest> = {}): PermissionMessage {
  return {
    id: 'permission-perm-1',
    role: 'permission',
    createdAt: '2026-01-01T00:00:00Z',
    request: {
      id: 'perm-1',
      toolName: 'write_file',
      description: '将写入 /tmp/foo.txt',
      status: 'pending',
      ...overrides,
    },
  };
}

describe('PermissionRequestCard', () => {
  it('显示工具名称和操作说明', () => {
    render(<PermissionRequestCard message={makeMessage()} onRespond={vi.fn()} />);
    expect(screen.getByTestId('permission-tool-name')).toHaveTextContent('write_file');
    expect(screen.getByTestId('permission-description')).toHaveTextContent('将写入 /tmp/foo.txt');
  });

  it('pending 状态显示允许、始终允许、拒绝、始终拒绝按钮', () => {
    render(<PermissionRequestCard message={makeMessage({ status: 'pending' })} onRespond={vi.fn()} />);
    expect(screen.getByTestId('permission-allow-btn')).toBeInTheDocument();
    expect(screen.getByTestId('permission-allow-always-btn')).toBeInTheDocument();
    expect(screen.getByTestId('permission-deny-btn')).toBeInTheDocument();
    expect(screen.getByTestId('permission-deny-always-btn')).toBeInTheDocument();
    expect(screen.getByTestId('permission-status')).toHaveTextContent('待处理');
  });

  it('点击允许按钮调用 onRespond(true, once)', () => {
    const onRespond = vi.fn();
    render(<PermissionRequestCard message={makeMessage()} onRespond={onRespond} />);
    fireEvent.click(screen.getByTestId('permission-allow-btn'));
    expect(onRespond).toHaveBeenCalledWith('perm-1', true, 'once');
  });

  it('点击始终允许按钮调用 onRespond(true, always)', () => {
    const onRespond = vi.fn();
    render(<PermissionRequestCard message={makeMessage()} onRespond={onRespond} />);
    fireEvent.click(screen.getByTestId('permission-allow-always-btn'));
    expect(onRespond).toHaveBeenCalledWith('perm-1', true, 'always');
  });

  it('点击拒绝按钮调用 onRespond(false, once)', () => {
    const onRespond = vi.fn();
    render(<PermissionRequestCard message={makeMessage()} onRespond={onRespond} />);
    fireEvent.click(screen.getByTestId('permission-deny-btn'));
    expect(onRespond).toHaveBeenCalledWith('perm-1', false, 'once');
  });

  it('点击始终拒绝按钮调用 onRespond(false, always)', () => {
    const onRespond = vi.fn();
    render(<PermissionRequestCard message={makeMessage()} onRespond={onRespond} />);
    fireEvent.click(screen.getByTestId('permission-deny-always-btn'));
    expect(onRespond).toHaveBeenCalledWith('perm-1', false, 'always');
  });

  it('已允许状态不显示操作按钮', () => {
    render(<PermissionRequestCard message={makeMessage({ status: 'allowed' })} onRespond={vi.fn()} />);
    expect(screen.queryByTestId('permission-allow-btn')).toBeNull();
    expect(screen.queryByTestId('permission-allow-always-btn')).toBeNull();
    expect(screen.queryByTestId('permission-deny-btn')).toBeNull();
    expect(screen.queryByTestId('permission-deny-always-btn')).toBeNull();
    expect(screen.getByTestId('permission-status')).toHaveTextContent('已允许');
  });

  it('已拒绝状态不显示操作按钮', () => {
    render(<PermissionRequestCard message={makeMessage({ status: 'denied' })} onRespond={vi.fn()} />);
    expect(screen.queryByTestId('permission-allow-btn')).toBeNull();
    expect(screen.queryByTestId('permission-deny-btn')).toBeNull();
    expect(screen.getByTestId('permission-status')).toHaveTextContent('已拒绝');
  });

  it('无描述时不渲染描述区域', () => {
    render(<PermissionRequestCard message={makeMessage({ description: '' })} onRespond={vi.fn()} />);
    expect(screen.queryByTestId('permission-description')).toBeNull();
  });
});
