import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserMessageView } from './UserMessageView';
import type { UserMessage } from '../../product/types';

function makeMessage(overrides: Partial<UserMessage> = {}): UserMessage {
  return {
    id: 'user-1',
    role: 'user',
    content: '用户消息内容',
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('UserMessageView', () => {
  it('显示用户消息内容', () => {
    render(<UserMessageView message={makeMessage()} />);
    expect(screen.getByText('用户消息内容')).toBeInTheDocument();
  });
});