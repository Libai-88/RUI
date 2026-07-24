import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SystemMessageView } from './SystemMessageView';
import type { SystemMessage } from '../../product/types';

function makeMessage(overrides: Partial<SystemMessage> = {}): SystemMessage {
  return {
    id: 'sys-1',
    role: 'system',
    content: '系统通知内容',
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('SystemMessageView', () => {
  it('显示系统消息内容', () => {
    render(<SystemMessageView message={makeMessage()} />);
    expect(screen.getByText('系统通知内容')).toBeInTheDocument();
  });
});