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

/** 构建 ACP WebSocket URL */
function buildAcpWsUrl(baseUrl: string, secretKey?: string): string {
  const acpUrl = new URL(`${baseUrl}/acp`);
  if (acpUrl.protocol === 'http:') {
    acpUrl.protocol = 'ws:';
  } else if (acpUrl.protocol === 'https:') {
    acpUrl.protocol = 'wss:';
  }
  if (secretKey) {
    acpUrl.searchParams.set('token', secretKey);
  }
  return acpUrl.toString();
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

/** 客户端工厂函数类型 */
export type AcpClientFactory = (wsUrl: string) => AcpClient;

/**
 * Web 端 ACP 适配器
 *
 * 通过注入的客户端工厂连接到 goose serve，
 * 将 ACP 通知转换为 RUI 产品层事件。
 */
export class WebAcpAdapter implements AcpAdapter {
  private client: AcpClient | null = null;
  private listeners: Set<(event: AdapterEvent) => void> = new Set();
  private stateManager = new ConnectionStateManager();
  private config: AcpConnectionConfig | null = null;

  constructor(private clientFactory: AcpClientFactory) {}

  /** 获取连接状态管理器 */
  getStateManager(): ConnectionStateManager {
    return this.stateManager;
  }

  async connect(config: AcpConnectionConfig): Promise<void> {
    this.config = config;
    this.stateManager.tryTransition(states.connecting());

    const baseUrl = normalizeBaseUrl(config.endpoint);
    const wsUrl = buildAcpWsUrl(baseUrl, config.secretKey);

    try {
      this.client = this.clientFactory(wsUrl);
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
    this.stateManager.reset();
    this.emit({ type: 'connection-state-changed', state: this.stateManager.getState() });
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
    this.stateManager.tryTransition(states.processing());

    await this.client.sessionPrompt({
      sessionId,
      prompt: content,
    });

    // 暂时直接标记完成，后续切片实现流式
    this.emit({ type: 'message-complete', sessionId, messageId });
    this.stateManager.tryTransition(states.connected());

    return messageId;
  }

  async cancelSession(sessionId: SessionId): Promise<void> {
    if (!this.client) throw new Error('ACP 未连接');

    await this.client.sessionCancel({ sessionId });
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

    this.emit({
      type: 'permission-resolved',
      sessionId,
      requestId,
      allowed,
    });
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
}
