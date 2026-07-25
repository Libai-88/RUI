import { describe, it, expect, beforeEach } from 'vitest';
import { t, setLocale, getLocale } from './i18n';

describe('i18n', () => {
  beforeEach(() => {
    setLocale('zh-CN');
  });

  it('默认语言为中文', () => {
    expect(getLocale()).toBe('zh-CN');
  });

  it('中文消息正常获取', () => {
    expect(t('header.title')).toBe('RUI');
    expect(t('session.new')).toBe('新建会话');
    expect(t('context.section.workspace')).toBe('工作区');
  });

  it('支持模板参数替换', () => {
    expect(t('chat.workspace.label', { path: '/tmp/proj' })).toBe('工作目录：/tmp/proj');
  });

  it('不存在的 key 返回 key 本身', () => {
    expect(t('nonexistent.key')).toBe('nonexistent.key');
  });

  it('切换到英文', () => {
    setLocale('en');
    expect(getLocale()).toBe('en');
    expect(t('session.new')).toBe('New Session');
    expect(t('context.section.workspace')).toBe('Workspace');
  });

  it('英文未定义的消息 fallback 到中文', () => {
    setLocale('en');
    expect(t('panel.right.collapse')).toBe('Collapse right panel');
  });
});
