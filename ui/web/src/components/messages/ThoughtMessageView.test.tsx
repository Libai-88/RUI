import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThoughtMessageView } from './ThoughtMessageView';
import type { ThoughtMessage } from '../../product/types';

function makeMessage(overrides: Partial<ThoughtMessage> = {}): ThoughtMessage {
  return {
    id: 'thought-1',
    role: 'thought',
    content: 'AI 正在思考…',
    isStreaming: false,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('ThoughtMessageView', () => {
  it('显示思考内容和 AI 思考中标签', () => {
    render(<ThoughtMessageView message={makeMessage()} />);
    expect(screen.getByTestId('thought-message')).toBeInTheDocument();
    expect(screen.getByText('AI 思考中')).toBeInTheDocument();
    expect(screen.getByTestId('thought-content')).toHaveTextContent('AI 正在思考…');
  });

  it('流式状态显示闪烁光标', () => {
    render(<ThoughtMessageView message={makeMessage({ isStreaming: true })} />);
    expect(document.querySelector('.rui-streaming-cursor')).toBeInTheDocument();
  });

  it('非流式状态不显示闪烁光标', () => {
    render(<ThoughtMessageView message={makeMessage({ isStreaming: false })} />);
    expect(document.querySelector('.rui-streaming-cursor')).toBeNull();
  });

  it('默认展开，点击头部可收起', () => {
    render(<ThoughtMessageView message={makeMessage()} />);
    expect(screen.getByTestId('thought-content')).toBeInTheDocument();
    fireEvent.click(screen.getByText('AI 思考中'));
    expect(screen.queryByTestId('thought-content')).toBeNull();
  });

  it('收起后点击头部可展开', () => {
    render(<ThoughtMessageView message={makeMessage()} />);
    fireEvent.click(screen.getByText('AI 思考中'));
    expect(screen.queryByTestId('thought-content')).toBeNull();
    fireEvent.click(screen.getByText('AI 思考中'));
    expect(screen.getByTestId('thought-content')).toBeInTheDocument();
  });

  it('展开时按钮显示收起，收起时显示展开', () => {
    render(<ThoughtMessageView message={makeMessage()} />);
    expect(screen.getByText('收起')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByText('AI 思考中'));
    expect(screen.getByText('展开')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
  });
});