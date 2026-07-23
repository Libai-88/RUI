import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('无配置时显示连接向导', () => {
    render(<App />);
    expect(screen.getByText('连接到 Goose ACP 服务')).toBeInTheDocument();
  });

  it('有配置时显示主界面', () => {
    localStorage.setItem(
      'rui:connection-config',
      JSON.stringify({
        endpoint: 'http://127.0.0.1:3000',
        workspace: '/tmp/project',
      }),
    );

    render(<App />);
    expect(screen.getByText('已连接到 ACP 服务。工作台正在准备中…')).toBeInTheDocument();
    expect(screen.getByText('http://127.0.0.1:3000')).toBeInTheDocument();
  });
});
