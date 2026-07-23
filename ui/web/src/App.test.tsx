import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  it('渲染 RUI 标题', () => {
    render(<App />);
    expect(screen.getByText('RUI')).toBeInTheDocument();
  });
});
