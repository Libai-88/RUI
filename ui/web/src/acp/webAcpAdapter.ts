import type {
  AcpAdapter,
  AcpConnectionConfig,
  AdapterEvent,
  SessionId,
  MessageId,
  SessionSummary,
  Workspace,
  Message,
  PermissionRequestId,
  ConnectionState,
} from '../product/types';
import { states, ConnectionStateManager } from '../connection/connectionStateMachine';

/** 生成唯一 ID */
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 规范化基础 URL */
function normalizeBaseUrl(endpoint: string): string {
  let url = endpoint.trim();
  while (url.endsWith('/')) url = url.slice(0, -1);
  if (url.endsWith('/acp')) url = url.slice(0, -4);
  return url;
}

/**
 * ACP 客户端接口
 *
 * 这是 RUI Web 对 Goose ACP 客户端的最小接口约束。
 * 实际实现可以是 Goose SDK 的 GooseClient 或测试 mock。
 */
export interface AcpClient {
  newSession(params: { cwd: string; mcpServers: unknown[]; _meta?: Record<string, unknown> }): Promise<{ sessionId: string | number }>;
  loadSession(params: { sessionId: string }): Promise<{ messages?: unknown[] }>;
  unstable_listSessions(params: unknown): Promise<AcpSessionListResponse>;
  sessionPrompt(params: { sessionId: string; prompt: string }): Promise<unknown>;
  sessionCancel(params: { sessionId: string }): Promise<unknown>;
  sessionUpdate(params: { sessionId: string; update: unknown }): Promise<unknown>;
}

/** ACP Session 列表响应 */
interface AcpSessionListResponse {
  sessions?: AcpSessionListItem[];
}

/** ACP Session 列表项 */
interface AcpSessionListItem {
  sessionId: string | number;
  title?: string | null;
  updatedAt?: string | null;
  _meta?: {
    lastMessageSnippet?: string;
    createdAt?: string;
  };
}

/** ACP session/update notification (only the fields RUI needs) */
export interface AcpSessionNotification {
  sessionId: string;
  update: {
    sessionUpdate:
      | 'agent_message_chunk'
      | 'agent_thought_chunk'
      | 'user_message_chunk'
      | 'tool_call'
      | 'tool_call_update'
      | 'session_info_update'
      | 'usage_update';
    content?: { type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string };
    messageId?: string;
    toolCallId?: string;
    title?: string;
    status?: string;
    rawInput?: unknown;
    rawOutput?: unknown;
  };
}

/** Callbacks the ACP client invokes for inbound notifications */
export interface AcpClientCallbacks {
  onSessionUpdate?(notification: AcpSessionNotification): void;
  onDisconnect?(reason?: string): void;
}

/** 客户端工厂函数类型 */
export type AcpClientFactory = (
  baseUrl: string,
  callbacks: AcpClientCallbacks,
) => AcpClient;

/** 单个 Session 的活跃 prompt 上下文 */
interface SessionMessageContext {
  messageId: string;
  /** 每次 sendMessage 生成的唯一 promptAttemptId，用于识别过期尝试 */
  promptAttemptId: string;
}

/**
 * Web 端 ACP 适配器
 *
 * 通过注入的客户端工厂连接到 goose serve，
 * 将 ACP 通知转换为 RUI 产品层事件。
 *
 * 每个 Session 维护独立的消息上下文（messageId / promptAttemptId）和
 * pending permission 集合，确保多 Session 并发时 stale prompt attempt
 * 不会覆盖其它 Session 的状态。
 */
export class WebAcpAdapter implements AcpAdapter {
  private client: AcpClient | null = null;
  private listeners: Set<(event: AdapterEvent) => void> = new Set();
  private stateManager = new ConnectionStateManager();
  private config: AcpConnectionConfig | null = null;
  /** Per-session 活跃 prompt 上下文，key 为 sessionId */
  private sessionMessageContext: Map<SessionId, SessionMessageContext> = new Map();
  /** Per-session pending permission 请求 ID 集合 */
  private pendingPermissions: Map<SessionId, Set<PermissionRequestId>> = new Map();

  constructor(private clientFactory: AcpClientFactory) {}

  /** 获取连接状态管理器 */
  getStateManager(): ConnectionStateManager {
    return this.stateManager;
  }

  async connect(config: AcpConnectionConfig): Promise<void> {
    this.config = config;
    this.stateManager.tryTransition(states.connecting());
    const baseUrl = normalizeBaseUrl(config.endpoint);
    try {
      this.client = this.clientFactory(baseUrl, {
        onSessionUpdate: (notification) => this.handleSessionUpdate(notification),
        onDisconnect: (reason) => this.handleDisconnect(reason),
      });
      this.stateManager.tryTransition(states.connected());
      this.emit({ type: 'connection-state-changed', state: this.stateManager.getState() });
    } catch (err) {
      const message = err instanceof Error ? err.message : '连接失败';
      this.stateManager.tryTransition(states.serviceUnavailable(message));
      this.emit({ type: 'connection-state-changed', state: this.stateManager.getState() });
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    this.client = null;
    this.config = null;
    this.sessionMessageContext.clear();
    this.pendingPermissions.clear();
    this.stateManager.reset();
    this.emit({ type: 'connection-state-changed', state: this.stateManager.getState() });
  }

  async reconnect(): Promise<void> {
    if (!this.config) throw new Error('无配置，无法重连');
    await this.connect(this.config);
  }

  subscribe(listener: (event: AdapterEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async createSession(workspace: Workspace): Promise<SessionId> {
    if (!this.client || !this.config) {
      throw new Error('ACP 未连接');
    }

    if (!workspace.path) {
      throw new Error('工作目录不能为空');
    }

    const response = await this.client.newSession({
      cwd: workspace.path,
      mcpServers: [],
      _meta: { client: 'rui-web' },
    });

    const sessionId = String(response.sessionId);
    this.emit({
      type: 'session-created',
      sessionId,
      workspace,
    });

    return sessionId;
  }

  async loadSession(sessionId: SessionId): Promise<void> {
    if (!this.client) throw new Error('ACP 未连接');

    const response = await this.client.loadSession({ sessionId });
    const messages = this.convertAcpMessages(response.messages || []);

    this.emit({
      type: 'session-loaded',
      sessionId,
      messages,
    });
  }

  async listSessions(): Promise<SessionSummary[]> {
    if (!this.client) throw new Error('ACP 未连接');

    const response = await this.client.unstable_listSessions({});
    const sessions: SessionSummary[] = (response.sessions || []).map((s) => ({
      id: String(s.sessionId),
      title: s.title || '未命名会话',
      description: s._meta?.lastMessageSnippet || '',
      createdAt: s._meta?.createdAt || s.updatedAt || '',
      updatedAt: s.updatedAt || '',
    }));

    this.emit({ type: 'session-list-updated', sessions });
    return sessions;
  }

  async sendMessage(sessionId: SessionId, content: string): Promise<MessageId> {
    if (!this.client) throw new Error('ACP 未连接');
    const messageId = generateId('msg');
    const promptAttemptId = generateId('prompt');
    // 每个 Session 维护独立的上下文，避免并发 sendMessage 互相覆盖
    this.sessionMessageContext.set(sessionId, { messageId, promptAttemptId });
    this.stateManager.tryTransition(states.processing());
    try {
      await this.client.sessionPrompt({
        sessionId,
        prompt: content,
      });
      this.emit({ type: 'message-complete', sessionId, messageId });
    } finally {
      // 仅当当前上下文仍是本次 attempt 时才清理，
      // 防止清理掉后续新 sendMessage 建立的上下文
      const ctx = this.sessionMessageContext.get(sessionId);
      if (ctx?.promptAttemptId === promptAttemptId) {
        this.sessionMessageContext.delete(sessionId);
      }
      this.stateManager.tryTransition(states.connected());
    }
    return messageId;
  }

  async cancelSession(sessionId: SessionId): Promise<void> {
    if (!this.client) throw new Error('ACP 未连接');

    await this.client.sessionCancel({ sessionId });
    this.sessionMessageContext.delete(sessionId);
    this.pendingPermissions.delete(sessionId);
    this.emit({ type: 'session-cancelled', sessionId });
    this.stateManager.tryTransition(states.connected());
  }

  async respondToPermission(
    sessionId: SessionId,
    requestId: PermissionRequestId,
    allowed: boolean,
  ): Promise<void> {
    if (!this.client) throw new Error('ACP 未连接');

    await this.client.sessionUpdate({
      sessionId,
      update: {
        sessionId,
        actions: [
          {
            type: allowed ? 'accept' : 'reject',
            requestId,
          },
        ],
      },
    });

    // 从该 Session 的 pending 集合中移除
    const pending = this.pendingPermissions.get(sessionId);
    if (pending) {
      pending.delete(requestId);
      if (pending.size === 0) this.pendingPermissions.delete(sessionId);
    }

    this.emit({
      type: 'permission-resolved',
      sessionId,
      requestId,
      allowed,
    });
  }

  /** 将 ACP session/update 通知转换为 RUI 适配器事件 */
  private handleSessionUpdate(notification: AcpSessionNotification): void {
    const { update, sessionId } = notification;
    if (update.sessionUpdate === 'agent_message_chunk') {
      if (!update.content || update.content.type !== 'text') return;
      // 使用 per-session 上下文中的 messageId，避免 stale chunk 归到错误 session
      const ctx = this.sessionMessageContext.get(sessionId);
      if (!ctx) return; // 该 Session 无活跃 prompt，丢弃 stale chunk
      this.emit({
        type: 'message-chunk',
        sessionId,
        messageId: ctx.messageId,
        delta: update.content.text,
      });
      return;
    }
    if (update.sessionUpdate === 'tool_call') {
      const toolCallId = update.toolCallId || generateId('tool');
      const toolName = update.title || '未知工具';
      const argumentsSummary = this.summarizeToolArguments(update.rawInput);
      this.emit({
        type: 'tool-call-started',
        sessionId,
        invocation: {
          id: toolCallId,
          toolName,
          argumentsSummary,
          status: 'in-progress',
          result: null,
        },
      });
      return;
    }
    if (update.sessionUpdate === 'tool_call_update') {
      const toolCallId = update.toolCallId || '';
      if (!toolCallId) return;
      const acpStatus = update.status || '';
      if (acpStatus === 'completed') {
        const resultContent = this.summarizeToolResult(update.rawOutput);
        this.emit({ type: 'tool-call-updated', sessionId, invocationId: toolCallId, status: 'completed' });
        this.emit({ type: 'tool-result', sessionId, invocationId: toolCallId, result: { content: resultContent, isError: false } });
      } else if (acpStatus === 'failed') {
        const errorContent = this.summarizeToolResult(update.rawOutput) || update.title || '工具调用失败';
        this.emit({ type: 'tool-call-updated', sessionId, invocationId: toolCallId, status: 'failed' });
        this.emit({ type: 'tool-result', sessionId, invocationId: toolCallId, result: { content: errorContent, isError: true } });
      } else {
        this.emit({ type: 'tool-call-updated', sessionId, invocationId: toolCallId, status: 'in-progress' });
      }
      return;
    }
  }

  /** 生成工具参数摘要 */
  private summarizeToolArguments(rawInput: unknown): string {
    if (typeof rawInput === 'string') return rawInput.slice(0, 200);
    if (rawInput && typeof rawInput === 'object') {
      try { return JSON.stringify(rawInput).slice(0, 200); } catch { return ''; }
    }
    return '';
  }

  /** 生成工具结果摘要 */
  private summarizeToolResult(rawOutput: unknown): string {
    if (typeof rawOutput === 'string') return rawOutput.slice(0, 500);
    if (rawOutput && typeof rawOutput === 'object') {
      try { return JSON.stringify(rawOutput).slice(0, 500); } catch { return ''; }
    }
    return '';
  }

  /** 处理连接断开：为所有活跃 Session 发射 connection-interrupted 事件并切换状态 */
  private handleDisconnect(_reason?: string): void {
    // 每个 Session 的活跃 prompt 都需要被标记为中断
    for (const [sessionId, ctx] of this.sessionMessageContext) {
      this.emit({
        type: 'connection-interrupted',
        sessionId,
        messageId: ctx.messageId,
      });
    }
    this.sessionMessageContext.clear();
    this.pendingPermissions.clear();
    this.stateManager.tryTransition(states.disconnected());
    this.emit({ type: 'connection-state-changed', state: this.stateManager.getState() });
  }

  /** 转换 ACP 历史消息为 RUI 产品层消息 */
  private convertAcpMessages(acpMessages: unknown[]): Message[] {
    const messages: Message[] = [];

    for (const msg of acpMessages) {
      const m = msg as Record<string, unknown>;
      const role = m.role as string;
      const parts = (m.parts || []) as unknown[];

      for (const part of parts) {
        const p = part as Record<string, unknown>;
        const pType = p.type as string;

        if (pType === 'text') {
          const content = String(p.text || '');
          if (role === 'user') {
            messages.push({
              id: generateId('msg'),
              role: 'user',
              content,
              createdAt: new Date().toISOString(),
            });
          } else if (role === 'assistant') {
            messages.push({
              id: generateId('msg'),
              role: 'assistant',
              content,
              isStreaming: false,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }
    }

    return messages;
  }

  /** 发射事件到所有监听器 */
  private emit(event: AdapterEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  /** 获取当前连接状态 */
  getConnectionState(): ConnectionState {
    return this.stateManager.getState();
  }

  /** 检查指定 Session 是否有活跃的 prompt attempt */
  hasActivePrompt(sessionId: SessionId): boolean {
    return this.sessionMessageContext.has(sessionId);
  }

  /** 获取指定 Session 的 pending permission 请求 ID 列表 */
  getPendingPermissionIds(sessionId: SessionId): PermissionRequestId[] {
    const set = this.pendingPermissions.get(sessionId);
    return set ? Array.from(set) : [];
  }

  /** 记录指定 Session 的 pending permission 请求（供 permission 流程使用） */
  registerPendingPermission(sessionId: SessionId, requestId: PermissionRequestId): void {
    let set = this.pendingPermissions.get(sessionId);
    if (!set) {
      set = new Set();
      this.pendingPermissions.set(sessionId, set);
    }
    set.add(requestId);
  }
}
