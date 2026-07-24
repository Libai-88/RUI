import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ConnectionWizard } from './ConnectionWizard';

const mockTestConnection = vi.fn();
vi.mock('../connection/connectionTest', () => ({
  testConnection: (...args: unknown[]) => mockTestConnection(...args),
}));

function fillForm(endpoint = 'http://127.0.0.1:3000', workspace = '/tmp/proj') {
  fireEvent.change(screen.getByLabelText(/ACP 地址/), { target: { value: endpoint } });
  fireEvent.change(screen.getByLabelText(/工作目录/), { target: { value: workspace } });
}

describe('ConnectionWizard', () => {
  beforeEach(() => {
    mockTestConnection.mockReset();
  });

  it('渲染连接表单', () => {
    render(<ConnectionWizard onConnected={vi.fn()} />);
    expect(screen.getByLabelText(/ACP 地址/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Secret Key/)).toBeInTheDocument();
    expect(screen.getByLabelText(/工作目录/)).toBeInTheDocument();
    expect(screen.getByText('测试连接')).toBeInTheDocument();
    expect(screen.getByText('直接连接')).toBeInTheDocument();
  });

  it('空地址时按钮为 disabled 状态', () => {
    render(<ConnectionWizard onConnected={vi.fn()} />);
    expect(screen.getByText('测试连接')).toBeDisabled();
    expect(screen.getByText('直接连接')).toBeDisabled();
  });

  it('填入地址后按钮可用', () => {
    render(<ConnectionWizard onConnected={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/ACP 地址/), { target: { value: 'http://127.0.0.1:3000' } });
    expect(screen.getByText('测试连接')).not.toBeDisabled();
    expect(screen.getByText('直接连接')).not.toBeDisabled();
  });

  it('测试连接成功时调用 onConnected', async () => {
    mockTestConnection.mockResolvedValue({ success: true, message: '连接成功' });
    const onConnected = vi.fn();
    render(<ConnectionWizard onConnected={onConnected} />);
    fillForm();
    fireEvent.click(screen.getByText('测试连接'));
    await waitFor(() => {
      expect(onConnected).toHaveBeenCalledWith({
        endpoint: 'http://127.0.0.1:3000',
        secretKey: undefined,
        workspace: '/tmp/proj',
      });
    });
  });

  it('测试连接失败时显示错误信息', async () => {
    mockTestConnection.mockResolvedValue({ success: false, message: '连接失败', reason: 'unknown' });
    const onConnected = vi.fn();
    render(<ConnectionWizard onConnected={onConnected} />);
    fillForm();
    fireEvent.click(screen.getByText('测试连接'));
    await waitFor(() => {
      expect(screen.getByText('连接失败')).toBeInTheDocument();
    });
    expect(onConnected).not.toHaveBeenCalled();
  });

  it('直接连接跳过测试', async () => {
    const onConnected = vi.fn();
    render(<ConnectionWizard onConnected={onConnected} />);
    fillForm();
    await act(async () => {
      fireEvent.click(screen.getByText('直接连接'));
    });
    expect(onConnected).toHaveBeenCalledWith({
      endpoint: 'http://127.0.0.1:3000',
      secretKey: undefined,
      workspace: '/tmp/proj',
    });
  });

  it('连接成功后禁用输入和按钮', async () => {
    mockTestConnection.mockResolvedValue({ success: true, message: '连接成功' });
    render(<ConnectionWizard onConnected={vi.fn()} />);
    fillForm();
    fireEvent.click(screen.getByText('测试连接'));
    await waitFor(() => {
      expect(screen.getByLabelText(/ACP 地址/)).toBeDisabled();
    });
    expect(screen.getByLabelText(/工作目录/)).toBeDisabled();
    expect(screen.getByText('测试连接')).toBeDisabled();
    expect(screen.getByText('直接连接')).toBeDisabled();
  });
});