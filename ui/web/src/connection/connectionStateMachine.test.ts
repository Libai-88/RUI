import { describe, it, expect } from 'vitest';
import {
  canTransition,
  transition,
  states,
  ConnectionStateManager,
  INITIAL_STATE,
} from './connectionStateMachine';

describe('connectionStateMachine', () => {
  describe('canTransition', () => {
    it('disconnected -> connecting 合法', () => {
      expect(canTransition(states.disconnected(), states.connecting())).toBe(true);
    });

    it('connecting -> connected 合法', () => {
      expect(canTransition(states.connecting(), states.connected())).toBe(true);
    });

    it('connecting -> authentication-failed 合法', () => {
      expect(canTransition(states.connecting(), states.authFailed('密钥错误'))).toBe(true);
    });

    it('connecting -> service-unavailable 合法', () => {
      expect(canTransition(states.connecting(), states.serviceUnavailable('不可达'))).toBe(true);
    });

    it('connected -> processing 合法', () => {
      expect(canTransition(states.connected(), states.processing())).toBe(true);
    });

    it('processing -> connected 合法', () => {
      expect(canTransition(states.processing(), states.connected())).toBe(true);
    });

    it('authentication-failed -> connecting 合法（重试）', () => {
      expect(canTransition(states.authFailed(''), states.connecting())).toBe(true);
    });

    it('service-unavailable -> connecting 合法（重试）', () => {
      expect(canTransition(states.serviceUnavailable(''), states.connecting())).toBe(true);
    });

    it('protocol-error -> connecting 合法（重连）', () => {
      expect(canTransition(states.protocolError(''), states.connecting())).toBe(true);
    });

    it('disconnected -> connected 非法（必须先 connecting）', () => {
      expect(canTransition(states.disconnected(), states.connected())).toBe(false);
    });

    it('connected -> connecting 非法', () => {
      expect(canTransition(states.connected(), states.connecting())).toBe(false);
    });
  });

  describe('transition', () => {
    it('合法转换返回目标状态', () => {
      const result = transition(states.disconnected(), states.connecting());
      expect(result.status).toBe('connecting');
    });

    it('非法转换抛出错误', () => {
      expect(() =>
        transition(states.disconnected(), states.connected()),
      ).toThrow('非法状态转换');
    });

    it('保留错误状态的 message', () => {
      const result = transition(
        states.connecting(),
        states.authFailed('密钥错误'),
      );
      if (result.status === 'authentication-failed') {
        expect(result.message).toBe('密钥错误');
      } else {
        expect.fail('状态应为 authentication-failed');
      }
    });
  });

  describe('ConnectionStateManager', () => {
    it('初始状态为 disconnected', () => {
      const mgr = new ConnectionStateManager();
      expect(mgr.getState().status).toBe('disconnected');
    });

    it('tryTransition 合法时返回 true 并更新状态', () => {
      const mgr = new ConnectionStateManager();
      expect(mgr.tryTransition(states.connecting())).toBe(true);
      expect(mgr.getState().status).toBe('connecting');
    });

    it('tryTransition 非法时返回 false 且不更新状态', () => {
      const mgr = new ConnectionStateManager();
      expect(mgr.tryTransition(states.connected())).toBe(false);
      expect(mgr.getState().status).toBe('disconnected');
    });

    it('transitionTo 合法时更新状态', () => {
      const mgr = new ConnectionStateManager();
      mgr.transitionTo(states.connecting());
      mgr.transitionTo(states.connected());
      expect(mgr.getState().status).toBe('connected');
    });

    it('transitionTo 非法时抛出错误', () => {
      const mgr = new ConnectionStateManager();
      expect(() => mgr.transitionTo(states.connected())).toThrow('非法状态转换');
    });

    it('subscribe 在状态变更时收到通知', () => {
      const mgr = new ConnectionStateManager();
      const received: ConnectionState_Status[] = [];
      mgr.subscribe((state) => received.push(state.status));

      mgr.tryTransition(states.connecting());
      mgr.tryTransition(states.connected());

      expect(received).toEqual(['connecting', 'connected']);
    });

    it('取消订阅后不再收到通知', () => {
      const mgr = new ConnectionStateManager();
      const received: string[] = [];
      const unsub = mgr.subscribe((state) => received.push(state.status));

      mgr.tryTransition(states.connecting());
      unsub();
      mgr.tryTransition(states.connected());

      expect(received).toEqual(['connecting']);
    });

    it('reset 回到初始状态', () => {
      const mgr = new ConnectionStateManager();
      mgr.tryTransition(states.connecting());
      mgr.tryTransition(states.connected());
      mgr.reset();
      expect(mgr.getState().status).toBe('disconnected');
    });

    it('完整重试流程：connecting -> auth-failed -> connecting -> connected', () => {
      const mgr = new ConnectionStateManager();
      mgr.tryTransition(states.connecting());
      mgr.tryTransition(states.authFailed('密钥错误'));
      expect(mgr.getState().status).toBe('authentication-failed');
      mgr.tryTransition(states.connecting());
      mgr.tryTransition(states.connected());
      expect(mgr.getState().status).toBe('connected');
    });

    it('处理流程：connected -> processing -> connected', () => {
      const mgr = new ConnectionStateManager();
      mgr.tryTransition(states.connecting());
      mgr.tryTransition(states.connected());
      mgr.tryTransition(states.processing());
      expect(mgr.getState().status).toBe('processing');
      mgr.tryTransition(states.connected());
      expect(mgr.getState().status).toBe('connected');
    });
  });

  it('INITIAL_STATE 是 disconnected', () => {
    expect(INITIAL_STATE.status).toBe('disconnected');
  });
});

/** 辅助类型 */
type ConnectionState_Status =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'authentication-failed'
  | 'service-unavailable'
  | 'protocol-error'
  | 'processing';
