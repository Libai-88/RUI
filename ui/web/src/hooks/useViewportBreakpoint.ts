import { useEffect, useState } from 'react';

/** 视口宽度断点 */
export type ViewportBreakpoint = 'wide' | 'medium' | 'narrow';

/** 中等宽度断点阈值（低于此宽度折叠右侧上下文区） */
export const MEDIUM_BREAKPOINT_PX = 1024;
/** 窄宽度断点阈值（低于此宽度折叠左侧 Session 区） */
export const NARROW_BREAKPOINT_PX = 720;

/** 根据宽度计算断点 */
export function computeBreakpoint(width: number): ViewportBreakpoint {
  if (width < NARROW_BREAKPOINT_PX) return 'narrow';
  if (width < MEDIUM_BREAKPOINT_PX) return 'medium';
  return 'wide';
}

/**
 * 监听视口宽度变化，返回当前断点。
 *
 * - wide（>= 1024px）：三栏同时可见
 * - medium（720px - 1023px）：折叠右侧上下文区
 * - narrow（< 720px）：折叠左侧 Session 区
 */
export function useViewportBreakpoint(): ViewportBreakpoint {
  const [breakpoint, setBreakpoint] = useState<ViewportBreakpoint>(() =>
    typeof window === 'undefined' ? 'wide' : computeBreakpoint(window.innerWidth),
  );

  useEffect(() => {
    function handleResize() {
      setBreakpoint(computeBreakpoint(window.innerWidth));
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return breakpoint;
}
