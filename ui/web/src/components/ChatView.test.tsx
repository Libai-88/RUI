import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ChatView } from './ChatView';
import type { AcpAdapter, AdapterEvent } from '../product/types';

function createFakeAdapter(sessionId: string = 'sess-1') {
  let listener: ((e: AdapterEvent) => void) | null = null;
  const adapter = {
    connect: vi.fn(async () => {}),
    disconnect: vi.fn(async () => {}),
    subscribe: vi.fn((l: (e: AdapterEvent) => void) => {
      listener = l;
      return () => {
        listener = null;
      };
    }),
    createSession: vi.fn(async () => sessionId),
    loadSession: vi.fn(async () => {}),
    listSessions: vi.fn(async () => []),
    sendMessage: vi.fn(async () => 'msg-assistant'),
    cancelSession: vi.fn(async () => {}),
    respondToPermission: vi.fn(async () => {}),
  } as unknown as AcpAdapter;
  return { adapter, emit: (e: AdapterEvent) => listener?.(e) };
}

describe('ChatView', () => {
  it('渲染加载状态，会话创建完成后显示输入框', async () => {
    const { adapter } = createFakeAdapter();
    render(<ChatView adapter={adapter} workspace={{ path: '/tmp/proj' }} />);

    expect(screen.getByText('正在创建会话…')).toBeInTheDocument();
    expect(await screen.findByPlaceholderText(/Enter 发送/)).toBeInTheDocument();
    expect(screen.getByText('工作目录：/tmp/proj')).toBeInTheDocument();
  });

  it('流式发送消息时显示 chunk 并在完成后移除光标', async () => {
    const { adapter, emit } = createFakeAdapter();
    render(<ChatView adapter={adapter} workspace={{ path: '/tmp/proj' }} />);

    const input = await screen.findByPlaceholderText(/Enter 发送/);
    fireEvent.change(input, { target: { value: '你好' } });
    await act(async () => {
      fireEvent.click(screen.getByText('发送'));
    });

    await waitFor(() => {
      expect(screen.getByText('你好')).toBeInTheDocument();
    });

    act(() => {
      emit({
        type: 'message-chunk',
        sessionId: 'sess-1',
        messageId: 'msg-assistant',
        delta: '你好',
      });
    });
    act(() => {
      emit({
        type: 'message-chunk',
        sessionId: 'sess-1',
        messageId: 'msg-assistant',
        delta: '！',
      });
    });

    await waitFor(() => {
      expect(screen.getByText('你好！')).toBeInTheDocument();
    });
    expect(document.querySelector('.rui-streaming-cursor')).not.toBeNull();

    act(() => {
      emit({
        type: 'message-complete',
        sessionId: 'sess-1',
        messageId: 'msg-assistant',
      });
    });

    await waitFor(() => {
      expect(document.querySelector('.rui-streaming-cursor')).toBeNull();
    });
  });

  it('会话创建失败时显示错误信息和重试按钮', async () => {
    const failingAdapter = {
      connect: vi.fn(async () => {}),
      disconnect: vi.fn(async () => {}),
      subscribe: vi.fn(() => () => {}),
      createSession: vi.fn(async () => {
        throw new Error('连接失败');
      }),
      loadSession: vi.fn(async () => {}),
      listSessions: vi.fn(async () => []),
      sendMessage: vi.fn(async () => 'msg-x'),
      cancelSession: vi.fn(async () => {}),
      respondToPermission: vi.fn(async () => {}),
    } as unknown as AcpAdapter;

    render(<ChatView adapter={failingAdapter} workspace={{ path: '/tmp' }} />);

    await waitFor(() => {
      expect(screen.getByText(/会话创建失败：连接失败/)).toBeInTheDocument();
    });
    expect(screen.getByText('重试')).toBeInTheDocument();
  });

  it('断线时显示恢复 UI 并保留已接收内容', async () => {
    const { adapter, emit } = createFakeAdapter();
    render(<ChatView adapter={adapter} workspace={{ path: '/tmp/proj' }} />);

    const input = await screen.findByPlaceholderText(/Enter 发送/);
    fireEvent.change(input, { target: { value: 'hello' } });
    await act(async () => {
      fireEvent.click(screen.getByText('发送'));
    });

    act(() => {
      emit({
        type: 'message-chunk',
        sessionId: 'sess-1',
        messageId: 'msg-assistant',
        delta: 'partial',
      });
    });

    await waitFor(() => {
      expect(screen.getByText('partial')).toBeInTheDocument();
    });

    act(() => {
      emit({
        type: 'connection-interrupted',
        sessionId: 'sess-1',
        messageId: 'msg-assistant',
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/连接已中断/)).toBeInTheDocument();
      expect(screen.getByText('重连')).toBeInTheDocument();
      expect(screen.getByText('重新发送')).toBeInTheDocument();
    });

    expect(screen.getByText('partial')).toBeInTheDocument();
    expect(document.querySelector('.rui-streaming-cursor')).toBeNull();
  });

  it('断线恢复 UI 中重新发送调用 adapter.sendMessage', async () => {
    const { adapter, emit } = createFakeAdapter();
    render(<ChatView adapter={adapter} workspace={{ path: '/tmp/proj' }} />);

    const input = await screen.findByPlaceholderText(/Enter 发送/);
    fireEvent.change(input, { target: { value: '重新发我' } });
    await act(async () => {
      fireEvent.click(screen.getByText('发送'));
    });

    act(() => {
      emit({
        type: 'connection-interrupted',
        sessionId: 'sess-1',
        messageId: 'msg-assistant',
      });
    });

    const resendBtn = await screen.findByText('重新发送');
    await act(async () => {
      fireEvent.click(resendBtn);
    });

    expect(adapter.sendMessage).toHaveBeenCalledTimes(2);
    expect(adapter.sendMessage).toHaveBeenLastCalledWith('sess-1', '重新发我');
  });
});
