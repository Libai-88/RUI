import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageInput } from './MessageInput';

describe('MessageInput', () => {
  it('Enter 发送消息，Shift+Enter 不发送', () => {
    const onSend = vi.fn();
    const onCancel = vi.fn();
    render(<MessageInput status="idle" onSend={onSend} onCancel={onCancel} />);

    const input = screen.getByPlaceholderText(/Enter 发送/);
    fireEvent.change(input, { target: { value: 'hello' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });
    expect(onSend).toHaveBeenCalledWith('hello');
  });

  it('streaming 时显示取消按钮，Esc 触发 onCancel', () => {
    const onSend = vi.fn();
    const onCancel = vi.fn();
    render(<MessageInput status="streaming" onSend={onSend} onCancel={onCancel} />);

    expect(screen.getByText('取消')).toBeInTheDocument();
    fireEvent.click(screen.getByText('取消'));
    expect(onCancel).toHaveBeenCalledTimes(1);

    const input = screen.getByPlaceholderText(/Enter 发送/);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it('idle 时 Esc 不触发 onCancel', () => {
    const onSend = vi.fn();
    const onCancel = vi.fn();
    render(<MessageInput status="idle" onSend={onSend} onCancel={onCancel} />);

    const input = screen.getByPlaceholderText(/Enter 发送/);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onCancel).not.toHaveBeenCalled();
  });
});
