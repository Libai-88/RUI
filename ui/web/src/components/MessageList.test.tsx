import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageList } from './MessageList';
import type { Message } from '../product/types';

function makeMessages(count: number): Message[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `msg-${i}`,
    role: 'user' as const,
    content: `消息 ${i}`,
    createdAt: '2026-01-01T00:00:00Z',
  }));
}

describe('MessageList', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('渲染消息列表', () => {
    render(<MessageList messages={makeMessages(2)} />);
    expect(screen.getByText('消息 0')).toBeInTheDocument();
    expect(screen.getByText('消息 1')).toBeInTheDocument();
  });

  it('初始位于底部时自动滚动', () => {
    render(<MessageList messages={makeMessages(1)} />);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('手动上滚后显示回到底部按钮，点击后恢复贴底', () => {
    render(<MessageList messages={makeMessages(3)} />);
    const list = screen.getByTestId('message-list');

    Object.defineProperty(list, 'scrollHeight', { configurable: true, value: 1000 });
    Object.defineProperty(list, 'scrollTop', { configurable: true, value: 0 });
    Object.defineProperty(list, 'clientHeight', { configurable: true, value: 200 });
    fireEvent.scroll(list);

    const jump = screen.getByTestId('jump-to-bottom');
    expect(jump).toHaveTextContent('回到底部');

    const callsBefore = (Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mock.calls.length;
    fireEvent.click(jump);
    expect((Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(
      callsBefore,
    );
    expect(screen.queryByTestId('jump-to-bottom')).toBeNull();
  });
});
