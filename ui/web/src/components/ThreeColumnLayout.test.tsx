import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThreeColumnLayout } from './ThreeColumnLayout';

function setInnerWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
}

describe('ThreeColumnLayout', () => {
  const originalWidth = window.innerWidth;

  afterEach(() => {
    setInnerWidth(originalWidth);
  });

  it('宽屏显示左中右三栏', () => {
    setInnerWidth(1440);
    render(<ThreeColumnLayout left="左" center="中" right="右" />);

    expect(screen.getByTestId('left-panel')).toHaveTextContent('左');
    expect(screen.getByTestId('center-panel')).toHaveTextContent('中');
    expect(screen.getByTestId('right-panel')).toHaveTextContent('右');
    expect(screen.getByRole('button', { name: '收起左栏' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: '收起右栏' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('中等宽度自动折叠右栏并允许展开', () => {
    setInnerWidth(800);
    render(<ThreeColumnLayout left="左" center="中" right="右" />);

    expect(screen.getByTestId('left-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('right-panel')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '展开右栏' }));
    expect(screen.getByTestId('right-panel')).toHaveTextContent('右');
  });

  it('窄屏自动折叠左右栏并提供展开和收起按钮', () => {
    setInnerWidth(500);
    render(<ThreeColumnLayout left="左" center="中" right="右" />);

    expect(screen.queryByTestId('left-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('right-panel')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '展开左栏' }));
    expect(screen.getByTestId('left-panel')).toHaveTextContent('左');
    fireEvent.click(screen.getByRole('button', { name: '展开右栏' }));
    expect(screen.getByTestId('right-panel')).toHaveTextContent('右');
  });
});
