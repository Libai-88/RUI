import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorMessageView } from './ErrorMessageView';
import type { ErrorMessage } from '../../product/types';

function makeMessage(overrides: Partial<ErrorMessage> = {}): ErrorMessage {
  return {
    id: 'err-1',
    role: 'error',
    content: '发生了一个错误',
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('ErrorMessageView', () => {
  it('显示错误内容', () => {
    render(<ErrorMessageView message={makeMessage()} />);
    expect(screen.getByText('发生了一个错误')).toBeInTheDocument();
  });

  it('有错误码时显示错误码', () => {
    render(<ErrorMessageView message={makeMessage({ code: 'E001' })} />);
    expect(screen.getByText('错误码：E001')).toBeInTheDocument();
  });

  it('无错误码时不显示错误码区域', () => {
    render(<ErrorMessageView message={makeMessage({ code: undefined })} />);
    expect(screen.queryByText(/错误码/)).toBeNull();
  });
});