import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useViewportBreakpoint, computeBreakpoint } from './useViewportBreakpoint';

function setInnerWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
}

describe('computeBreakpoint', () => {
  it('宽度 >= 1024 返回 wide', () => {
    expect(computeBreakpoint(1024)).toBe('wide');
    expect(computeBreakpoint(1440)).toBe('wide');
  });

  it('720 <= 宽度 < 1024 返回 medium', () => {
    expect(computeBreakpoint(720)).toBe('medium');
    expect(computeBreakpoint(1023)).toBe('medium');
  });

  it('宽度 < 720 返回 narrow', () => {
    expect(computeBreakpoint(719)).toBe('narrow');
    expect(computeBreakpoint(360)).toBe('narrow');
  });
});

describe('useViewportBreakpoint', () => {
  const originalWidth = window.innerWidth;

  afterEach(() => {
    setInnerWidth(originalWidth);
  });

  it('初始根据当前 window.innerWidth 返回断点', () => {
    setInnerWidth(1440);
    const { result } = renderHook(() => useViewportBreakpoint());
    expect(result.current).toBe('wide');
  });

  it('resize 到 medium 范围时更新断点', () => {
    setInnerWidth(1440);
    const { result } = renderHook(() => useViewportBreakpoint());

    act(() => {
      setInnerWidth(800);
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current).toBe('medium');
  });

  it('resize 到 narrow 范围时更新断点', () => {
    setInnerWidth(1440);
    const { result } = renderHook(() => useViewportBreakpoint());

    act(() => {
      setInnerWidth(500);
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current).toBe('narrow');
  });

  it('卸载后不再监听 resize', () => {
    setInnerWidth(1440);
    const { result, unmount } = renderHook(() => useViewportBreakpoint());
    unmount();

    act(() => {
      setInnerWidth(500);
      window.dispatchEvent(new Event('resize'));
    });

    // unmount 后 hook 不再更新，仍保持卸载前的值
    expect(result.current).toBe('wide');
  });
});
