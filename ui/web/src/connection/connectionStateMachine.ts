import type { ConnectionState } from '../product/types';

/**
 * 连接状态机
 *
 * 管理 RUI 与 Goose ACP 服务之间的连接状态转换。
 * 所有合法的状态转换都通过此模块驱动。
 */

/** 合法状态转换映射 */
const TRANSITIONS: Record<ConnectionState['status'], ConnectionState['status'][]> = {
  'disconnected': ['connecting'],
  'connecting': ['connected', 'authentication-failed', 'service-unavailable', 'protocol-error', 'disconnected'],
  'connected': ['processing', 'disconnected', 'service-unavailable', 'protocol-error'],
  'processing': ['connected', 'disconnected', 'service-unavailable', 'protocol-error'],
  'authentication-failed': ['connecting', 'disconnected'],
  'service-unavailable': ['connecting', 'disconnected'],
  'protocol-error': ['connecting', 'disconnected'],
};

/** 判断状态转换是否合法 */
export function canTransition(
  from: ConnectionState,
  to: ConnectionState,
): boolean {
  const allowed = TRANSITIONS[from.status];
  return allowed.includes(to.status);
}

/**
 * 执行状态转换。
 * 如果转换不合法，抛出错误。
 */
export function transition(
  from: ConnectionState,
  to: ConnectionState,
): ConnectionState {
  if (!canTransition(from, to)) {
    throw new Error(
      `非法状态转换：${from.status} -> ${to.status}`,
    );
  }
  return to;
}

/** 初始状态 */
export const INITIAL_STATE: ConnectionState = { status: 'disconnected' };

/**
 * 便捷的状态构造函数
 */
export const states = {
  disconnected: (): ConnectionState => ({ status: 'disconnected' }),
  connecting: (): ConnectionState => ({ status: 'connecting' }),
  connected: (): ConnectionState => ({ status: 'connected' }),
  processing: (): ConnectionState => ({ status: 'processing' }),
  authFailed: (message: string): ConnectionState => ({
    status: 'authentication-failed',
    message,
  }),
  serviceUnavailable: (message: string): ConnectionState => ({
    status: 'service-unavailable',
    message,
  }),
  protocolError: (message: string): ConnectionState => ({
    status: 'protocol-error',
    message,
  }),
};

/**
 * 连接状态管理器
 *
 * 跟踪当前连接状态，允许订阅状态变更。
 */
export class ConnectionStateManager {
  private state: ConnectionState = INITIAL_STATE;
  private listeners: Set<(state: ConnectionState) => void> = new Set();

  /** 获取当前状态 */
  getState(): ConnectionState {
    return this.state;
  }

  /** 订阅状态变更，返回取消订阅函数 */
  subscribe(listener: (state: ConnectionState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** 尝试转换状态，返回是否成功 */
  tryTransition(to: ConnectionState): boolean {
    if (!canTransition(this.state, to)) return false;
    this.state = to;
    this.notify();
    return true;
  }

  /** 强制转换状态（合法时），非法时抛出 */
  transitionTo(to: ConnectionState): void {
    this.state = transition(this.state, to);
    this.notify();
  }

  /** 重置为初始状态 */
  reset(): void {
    this.state = INITIAL_STATE;
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}
