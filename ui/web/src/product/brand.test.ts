import { describe, it, expect } from 'vitest';
import { brand } from './brand';

describe('brand', () => {
  it('品牌名称为 RUI', () => {
    expect(brand.name).toBe('RUI');
  });

  it('品牌色集中定义', () => {
    expect(brand.colors.primary).toBe('#3182ce');
    expect(brand.colors.danger).toBe('#e53e3e');
    expect(brand.colors.success).toBe('#38a169');
  });

  it('Logo 为文本占位模式', () => {
    expect(brand.logo.type).toBe('text');
    expect(brand.logo.text).toBe('RUI');
  });
});
