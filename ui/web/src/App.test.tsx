import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { App } from './App';

vi.mock('./acp/gooseClientFactory', () => ({
  createGooseClientFactory: () => () => ({
    newSession: async () => ({ sessionId: 'test-sess' }),
    loadSession: async () => ({ messages: [] }),
    unstable_listSessions: async () => ({ sessions: [] }),
    sessionPrompt: async () => ({}),
    sessionCancel: async () => ({}),
    sessionUpdate: async () => ({}),
  }),
}));

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('无配置时显示连接向导', () => {
    render(<App />);
    expect(screen.getByText('连接到 Goose ACP 服务')).toBeInTheDocument();
  });

  it('有配置时连接并显示工作台', async () => {
    localStorage.setItem(
      'rui:connection-config',
      JSON.stringify({
        endpoint: 'http://127.0.0.1:3000',
        workspace: '/tmp/project',
      }),
    );

    render(<App />);
    expect(screen.getByText('http://127.0.0.1:3000')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('工作目录：/tmp/project')).toBeInTheDocument();
    });
  });

  it('新建会话按钮有 data-shortcut 属性', async () => {
    localStorage.setItem(
      'rui:connection-config',
      JSON.stringify({
        endpoint: 'http://127.0.0.1:3000',
        workspace: '/tmp/project',
      }),
    );

    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('工作目录：/tmp/project')).toBeInTheDocument();
    });

    const newSessionBtn = screen.getByText('新建会话').closest('button');
    expect(newSessionBtn).toHaveAttribute('data-shortcut', 'new-session');
  });

  it('Ctrl+K 触发新建会话', async () => {
    localStorage.setItem(
      'rui:connection-config',
      JSON.stringify({
        endpoint: 'http://127.0.0.1:3000',
        workspace: '/tmp/project',
      }),
    );

    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('工作目录：/tmp/project')).toBeInTheDocument();
    });

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    await waitFor(() => {
      // Ctrl+K triggers new session creation
      expect(screen.getByText('正在创建会话…')).toBeInTheDocument();
    });
  });
});
