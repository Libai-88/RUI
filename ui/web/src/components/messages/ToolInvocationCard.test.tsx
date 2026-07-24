import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToolInvocationCard } from './ToolInvocationCard';
import type { ToolMessage, ToolInvocationStatus } from '../../product/types';

const STATUS_RGB: Record<ToolInvocationStatus, string> = {
  'in-progress': 'rgb(49, 130, 206)',
  completed: 'rgb(56, 161, 105)',
  failed: 'rgb(229, 62, 62)',
};

function makeMessage(overrides: {
  toolName?: string;
  argumentsSummary?: string;
  status?: ToolInvocationStatus;
  result?: { content: string; isError: boolean } | null;
}): ToolMessage {
  return {
    id: 'tool-msg-1',
    role: 'tool',
    createdAt: '2026-01-01T00:00:00Z',
    toolInvocation: {
      id: 'tool-1',
      toolName: overrides.toolName ?? 'read_file',
      argumentsSummary: overrides.argumentsSummary ?? '{"path":"/tmp/foo.txt"}',
      status: overrides.status ?? 'in-progress',
      result: overrides.result ?? null,
    },
  };
}

describe('ToolInvocationCard', () => {
  it('显示工具名称和参数摘要', () => {
    render(<ToolInvocationCard message={makeMessage({ toolName: 'search', argumentsSummary: 'query=foo' })} />);
    expect(screen.getByTestId('tool-name')).toHaveTextContent('search');
    expect(screen.getByTestId('tool-arguments')).toHaveTextContent('query=foo');
  });

  it('无参数摘要时不渲染参数区域', () => {
    render(<ToolInvocationCard message={makeMessage({ argumentsSummary: '' })} />);
    expect(screen.queryByTestId('tool-arguments')).toBeNull();
  });

  it('执行中状态显示蓝色', () => {
    render(<ToolInvocationCard message={makeMessage({ status: 'in-progress' })} />);
    const indicator = screen.getByTestId('status-indicator');
    expect(indicator.style.background).toBe(STATUS_RGB['in-progress']);
    expect(screen.getByTestId('status-label')).toHaveTextContent('执行中…');
  });

  it('已完成状态显示绿色和结果', () => {
    render(
      <ToolInvocationCard
        message={makeMessage({
          status: 'completed',
          result: { content: '文件内容', isError: false },
        })}
      />,
    );
    const indicator = screen.getByTestId('status-indicator');
    expect(indicator.style.background).toBe(STATUS_RGB.completed);
    expect(screen.getByTestId('status-label')).toHaveTextContent('已完成');
    expect(screen.getByTestId('tool-result')).toHaveTextContent('文件内容');
  });

  it('已失败状态显示红色', () => {
    render(
      <ToolInvocationCard
        message={makeMessage({
          status: 'failed',
          result: { content: '出错了', isError: true },
        })}
      />,
    );
    const indicator = screen.getByTestId('status-indicator');
    expect(indicator.style.background).toBe(STATUS_RGB.failed);
    expect(screen.getByTestId('status-label')).toHaveTextContent('已失败');
  });

  it('无结果时不渲染结果区域', () => {
    render(<ToolInvocationCard message={makeMessage({ status: 'in-progress', result: null })} />);
    expect(screen.queryByTestId('tool-result')).toBeNull();
  });

  it('卡片左边框颜色随状态变化', () => {
    const { rerender } = render(<ToolInvocationCard message={makeMessage({ status: 'in-progress' })} />);
    expect(screen.getByTestId('tool-card').style.borderLeft).toBe(`4px solid ${STATUS_RGB['in-progress']}`);

    rerender(<ToolInvocationCard message={makeMessage({ status: 'completed' })} />);
    expect(screen.getByTestId('tool-card').style.borderLeft).toBe(`4px solid ${STATUS_RGB.completed}`);

    rerender(<ToolInvocationCard message={makeMessage({ status: 'failed' })} />);
    expect(screen.getByTestId('tool-card').style.borderLeft).toBe(`4px solid ${STATUS_RGB.failed}`);
  });

  it('失败结果显示错误标签和红色结果区', () => {
    render(
      <ToolInvocationCard
        message={makeMessage({
          status: 'failed',
          result: { content: '权限不足', isError: true },
        })}
      />,
    );
    expect(screen.getByTestId('result-label')).toHaveTextContent('错误');
    expect(screen.getByTestId('tool-result')).toHaveTextContent('权限不足');
    expect(screen.getByTestId('tool-result').style.color).toBe('rgb(197, 48, 48)');
    expect(screen.getByTestId('status-icon')).toHaveTextContent('✕');
  });

  it('长结果可展开收起', () => {
    const long = 'x'.repeat(200);
    render(
      <ToolInvocationCard
        message={makeMessage({
          status: 'completed',
          result: { content: long, isError: false },
        })}
      />,
    );
    const toggle = screen.getByTestId('result-toggle');
    expect(toggle).toHaveTextContent('展开');
    expect(screen.getByTestId('tool-result').style.maxHeight).toBe('80px');

    fireEvent.click(toggle);
    expect(screen.getByTestId('result-toggle')).toHaveTextContent('收起');
    expect(screen.getByTestId('tool-result').style.maxHeight).toBe('none');
  });

  it('短结果不显示展开按钮', () => {
    render(
      <ToolInvocationCard
        message={makeMessage({
          status: 'completed',
          result: { content: '短结果', isError: false },
        })}
      />,
    );
    expect(screen.queryByTestId('result-toggle')).toBeNull();
  });
});
