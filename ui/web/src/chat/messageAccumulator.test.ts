import { describe, it, expect } from 'vitest';
import { accumulateChunk, finalizeMessage, markInterrupted } from './messageAccumulator';
import type { Message } from '../product/types';

describe('messageAccumulator', () => {
  it('首个 chunk 创建新的流式助手消息', () => {
    const result = accumulateChunk([], {
      sessionId: 's1',
      messageId: 'm1',
      delta: '你好',
    });
    expect(result.length).toBe(1);
    expect(result[0].role).toBe('assistant');
    if (result[0].role === 'assistant') {
      expect(result[0].id).toBe('m1');
      expect(result[0].content).toBe('你好');
      expect(result[0].isStreaming).toBe(true);
    }
  });

  it('相同 messageId 的第二个 chunk 追加到内容', () => {
    const existing: Message[] = [
      {
        id: 'm1',
        role: 'assistant',
        content: '你好',
        isStreaming: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    const result = accumulateChunk(existing, {
      sessionId: 's1',
      messageId: 'm1',
      delta: '！',
    });
    expect(result.length).toBe(1);
    if (result[0].role === 'assistant') {
      expect(result[0].content).toBe('你好！');
      expect(result[0].isStreaming).toBe(true);
    }
  });

  it('不同 messageId 的 chunk 创建独立的助手消息', () => {
    const existing: Message[] = [
      {
        id: 'm1',
        role: 'assistant',
        content: '你好',
        isStreaming: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    const result = accumulateChunk(existing, {
      sessionId: 's1',
      messageId: 'm2',
      delta: '新消息',
    });
    expect(result.length).toBe(2);
    expect(result[1].role).toBe('assistant');
    if (result[1].role === 'assistant') {
      expect(result[1].id).toBe('m2');
      expect(result[1].content).toBe('新消息');
    }
  });

  it('finalizeMessage 将匹配的消息标记为非流式', () => {
    const existing: Message[] = [
      {
        id: 'm1',
        role: 'assistant',
        content: '你好',
        isStreaming: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    const result = finalizeMessage(existing, 'm1');
    if (result[0].role === 'assistant') {
      expect(result[0].isStreaming).toBe(false);
    }
  });

  it('finalizeMessage 不影响不匹配的消息', () => {
    const existing: Message[] = [
      {
        id: 'm1',
        role: 'assistant',
        content: '你好',
        isStreaming: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'm2',
        role: 'assistant',
        content: '另外一条',
        isStreaming: true,
        createdAt: '2026-01-01T00:00:01.000Z',
      },
    ];
    const result = finalizeMessage(existing, 'm2');
    if (result[0].role === 'assistant') {
      expect(result[0].isStreaming).toBe(true);
    }
    if (result[1].role === 'assistant') {
      expect(result[1].isStreaming).toBe(false);
    }
  });

  it('markInterrupted 停止流式光标但保留内容', () => {
    const existing: Message[] = [
      {
        id: 'm1',
        role: 'assistant',
        content: 'partial',
        isStreaming: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    const result = markInterrupted(existing, 'm1');
    expect(result.length).toBe(1);
    expect(result[0].role).toBe('assistant');
    if (result[0].role === 'assistant') {
      expect(result[0].content).toBe('partial');
      expect(result[0].isStreaming).toBe(false);
    }
  });

  it('markInterrupted messageId 为 null 时返回原数组', () => {
    const existing: Message[] = [];
    expect(markInterrupted(existing, null)).toBe(existing);
  });

  it('markInterrupted 不影响不匹配的消息', () => {
    const existing: Message[] = [
      {
        id: 'm1',
        role: 'assistant',
        content: 'streaming',
        isStreaming: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    const result = markInterrupted(existing, 'm-other');
    if (result[0].role === 'assistant') {
      expect(result[0].isStreaming).toBe(true);
    }
  });
});
