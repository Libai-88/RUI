import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContextArea, type ContextAreaProps } from './ContextArea';

function renderContextArea(overrides?: Partial<ContextAreaProps>) {
  const defaults: ContextAreaProps = {
    workspacePath: 'D:/projects/test',
    endpoint: 'http://localhost:9000',
    connectionState: 'connected',
    pendingPermissions: [],
    onRespondPermission: vi.fn(async () => {}),
  };
  return render(<ContextArea {...defaults} {...overrides} />);
}

describe('ContextArea', () => {
  it('渲染工作区路径', () => {
    renderContextArea({ workspacePath: '/home/user/proj' });
    expect(screen.getByTestId('context-workspace-path')).toHaveTextContent('/home/user/proj');
  });

  it('连接状态为 connected 时显示已连接', () => {
    renderContextArea({ connectionState: 'connected' });
    expect(screen.getByTestId('context-connection-state')).toHaveTextContent('已连接');
  });

  it('连接状态为 connecting 时显示连接中', () => {
    renderContextArea({ connectionState: 'connecting' });
    expect(screen.getByTestId('context-connection-state')).toHaveTextContent('连接中…');
  });

  it('连接状态为 error 时显示连接失败', () => {
    renderContextArea({ connectionState: 'error' });
    expect(screen.getByTestId('context-connection-state')).toHaveTextContent('连接失败');
  });

  it('显示端点地址', () => {
    renderContextArea({ endpoint: 'https://acp.example.com:9090' });
    expect(screen.getByTestId('context-connection-state').parentElement).toHaveTextContent(
      'https://acp.example.com:9090',
    );
  });

  it('无待处理权限时显示提示文字', () => {
    renderContextArea({ pendingPermissions: [] });
    expect(screen.getByTestId('context-no-permissions')).toHaveTextContent('无待处理权限');
  });

  it('有待处理权限时显示列表和数量徽标', () => {
    renderContextArea({
      pendingPermissions: [
        { id: 'p1', toolName: 'read_file', description: '读取文件', status: 'pending' },
        { id: 'p2', toolName: 'write_file', description: '写入文件', status: 'pending' },
      ],
    });
    expect(screen.getAllByTestId('context-permission-item')).toHaveLength(2);
    expect(screen.getByText('read_file')).toBeInTheDocument();
    expect(screen.getByText('write_file')).toBeInTheDocument();
  });

  it('权限按钮点击调用 onRespondPermission', async () => {
    const onRespond = vi.fn(async () => {});
    renderContextArea({
      pendingPermissions: [
        { id: 'req-1', toolName: 'bash', description: '执行命令', status: 'pending' },
      ],
      onRespondPermission: onRespond,
    });
    fireEvent.click(screen.getByText('允许'));
    expect(onRespond).toHaveBeenCalledWith('req-1', true, 'once');
  });

  it('始终允许按钮调用 with scope always', () => {
    const onRespond = vi.fn(async () => {});
    renderContextArea({
      pendingPermissions: [
        { id: 'req-2', toolName: 'bash', description: '', status: 'pending' },
      ],
      onRespondPermission: onRespond,
    });
    fireEvent.click(screen.getByText('始终允许'));
    expect(onRespond).toHaveBeenCalledWith('req-2', true, 'always');
  });

  it('Provider 和模型显示默认值"待获取"', () => {
    renderContextArea();
    expect(screen.getByTestId('context-provider-name')).toHaveTextContent('待获取');
    expect(screen.getByTestId('context-model-name')).toHaveTextContent('待获取');
  });

  it('Provider 和模型可传入自定义值', () => {
    renderContextArea({ providerLabel: 'openai', modelLabel: 'gpt-4' });
    expect(screen.getByTestId('context-provider-name')).toHaveTextContent('openai');
    expect(screen.getByTestId('context-model-name')).toHaveTextContent('gpt-4');
  });

  it('显示即将推出入口', () => {
    renderContextArea();
    expect(screen.getByText('MCP 扩展')).toBeInTheDocument();
    expect(screen.getByText('Recipe')).toBeInTheDocument();
    expect(screen.getByText('配置编辑')).toBeInTheDocument();
  });
});
