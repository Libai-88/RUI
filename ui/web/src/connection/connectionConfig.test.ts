import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadConnectionConfig,
  saveConnectionConfig,
  clearConnectionConfig,
  hasConnectionConfig,
} from './connectionConfig';
import type { AcpConnectionConfig } from '../product/types';

describe('connectionConfig', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('无配置时返回 null', () => {
    expect(loadConnectionConfig()).toBeNull();
    expect(hasConnectionConfig()).toBe(false);
  });

  it('保存后可读取配置', () => {
    const config: AcpConnectionConfig = {
      endpoint: 'http://127.0.0.1:3000',
      secretKey: 'my-secret',
      workspace: 'D:/Rui/project',
    };

    saveConnectionConfig(config);
    expect(hasConnectionConfig()).toBe(true);

    const loaded = loadConnectionConfig();
    expect(loaded).not.toBeNull();
    expect(loaded!.endpoint).toBe('http://127.0.0.1:3000');
    expect(loaded!.secretKey).toBe('my-secret');
    expect(loaded!.workspace).toBe('D:/Rui/project');
  });

  it('无 secretKey 时正确保存', () => {
    const config: AcpConnectionConfig = {
      endpoint: 'http://localhost:3000',
      workspace: '/home/user/project',
    };

    saveConnectionConfig(config);
    const loaded = loadConnectionConfig();
    expect(loaded).not.toBeNull();
    expect(loaded!.secretKey).toBeUndefined();
    expect(loaded!.workspace).toBe('/home/user/project');
  });

  it('清除后配置为空', () => {
    const config: AcpConnectionConfig = {
      endpoint: 'http://127.0.0.1:3000',
      workspace: '/tmp',
    };

    saveConnectionConfig(config);
    expect(hasConnectionConfig()).toBe(true);

    clearConnectionConfig();
    expect(hasConnectionConfig()).toBe(false);
    expect(loadConnectionConfig()).toBeNull();
  });

  it('损坏的 JSON 返回 null', () => {
    localStorage.setItem('rui:connection-config', '{invalid json');
    expect(loadConnectionConfig()).toBeNull();
  });

  it('缺少 endpoint 字段返回 null', () => {
    localStorage.setItem('rui:connection-config', JSON.stringify({ workspace: '/tmp' }));
    expect(loadConnectionConfig()).toBeNull();
  });
});
