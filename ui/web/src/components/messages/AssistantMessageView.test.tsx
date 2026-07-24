import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AssistantMessageView } from './AssistantMessageView';
import type { AssistantMessage } from '../../product/types';

vi.mock('react-syntax-highlighter', () => ({
  Prism: ({ children }: { children?: ReactNode }) => (
    <pre data-testid="syntax-highlighter">{children}</pre>
  ),
}));

vi.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  oneDark: {},
}));

function makeMessage(overrides: Partial<AssistantMessage> = {}): AssistantMessage {
  return {
    id: 'msg-1',
    role: 'assistant',
    content: '',
    isStreaming: false,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('AssistantMessageView', () => {
  it('renders plain text content', () => {
    render(<AssistantMessageView message={makeMessage({ content: 'hello' })} />);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('renders a markdown heading as h2', () => {
    render(<AssistantMessageView message={makeMessage({ content: '## Title' })} />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Title');
  });

  it('renders a fenced code block with the syntax highlighter', () => {
    render(
      <AssistantMessageView
        message={makeMessage({ content: "```js\nconsole.log('hi')\n```" })}
      />,
    );
    const highlighter = screen.getByTestId('syntax-highlighter');
    expect(highlighter).toBeInTheDocument();
    expect(highlighter).toHaveTextContent("console.log('hi')");
  });

  it('renders markdown list items', () => {
    render(
      <AssistantMessageView message={makeMessage({ content: '- item1\n- item2' })} />,
    );
    expect(screen.getByText('item1')).toBeInTheDocument();
    expect(screen.getByText('item2')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('renders a GFM table', () => {
    const content = '| a | b |\n| --- | --- |\n| 1 | 2 |';
    render(<AssistantMessageView message={makeMessage({ content })} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('renders a markdown link with href', () => {
    render(
      <AssistantMessageView
        message={makeMessage({ content: '[text](http://example.com)' })}
      />,
    );
    const link = screen.getByRole('link', { name: 'text' });
    expect(link).toHaveAttribute('href', 'http://example.com');
  });

  it('shows the streaming cursor while streaming', () => {
    render(<AssistantMessageView message={makeMessage({ isStreaming: true })} />);
    expect(document.querySelector('.rui-streaming-cursor')).not.toBeNull();
  });

  it('hides the streaming cursor when not streaming', () => {
    render(<AssistantMessageView message={makeMessage({ isStreaming: false })} />);
    expect(document.querySelector('.rui-streaming-cursor')).toBeNull();
  });

  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(async () => undefined),
      },
    });
  });

  it('显示消息复制按钮并复制全文', async () => {
    render(<AssistantMessageView message={makeMessage({ content: '可复制内容' })} />);
    fireEvent.click(screen.getByTestId('message-copy-btn'));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('可复制内容');
    });
  });

  it('代码块显示复制按钮并复制代码', async () => {
    render(
      <AssistantMessageView
        message={makeMessage({ content: "```js\nconsole.log('hi')\n```" })}
      />,
    );
    fireEvent.click(screen.getByTestId('code-copy-btn'));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("console.log('hi')");
    });
  });

  it('流式中不显示消息复制按钮', () => {
    render(
      <AssistantMessageView message={makeMessage({ content: 'streaming', isStreaming: true })} />,
    );
    expect(screen.queryByTestId('message-copy-btn')).toBeNull();
  });
});
