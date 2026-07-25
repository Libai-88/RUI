/**
 * RUI 产品层核心类型定义
 *
 * 这些类型是 RUI Web 的产品模型，不直接依赖 ACP transport 类型。
 * ACP adapter 负责将 Goose ACP 通知转换为这些类型。
 */

// ---------------------------------------------------------------------------
// 连接状态
// ---------------------------------------------------------------------------

/** ACP 连接状态机 */
export type ConnectionState =
  | { status: 'disconnected' }
  | { status: 'connecting' }
  | { status: 'connected' }
  | { status: 'authentication-failed'; message: string }
  | { status: 'service-unavailable'; message: string }
  | { status: 'protocol-error'; message: string }
  | { status: 'processing' };

// ---------------------------------------------------------------------------
// 会话
// ---------------------------------------------------------------------------

/** Session 标识 */
export type SessionId = string;

/** Session 在列表中的摘要信息 */
export interface SessionSummary {
  id: SessionId;
  title: string;
  description: string;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
}

/** Session 的完整快照 */
export interface SessionSnapshot {
  id: SessionId;
  workspace: Workspace;
  messages: Message[];
  status: SessionStatus;
  provider: ProviderConfigSummary | null;
}

/** Session 运行状态 */
export type SessionStatus =
  | 'idle'
  | 'streaming'
  | 'waiting-for-permission'
  | 'cancelled'
  | 'error'
  | 'interrupted';

// ---------------------------------------------------------------------------
// 消息
// ---------------------------------------------------------------------------

/** 消息唯一标识 */
export type MessageId = string;

/** 消息角色 */
export type MessageRole = 'user' | 'assistant' | 'system';

/** RUI 产品层消息联合类型 */
export type Message =
  | UserMessage
  | AssistantMessage
  | SystemMessage
  | ToolMessage
  | PermissionMessage
  | ErrorMessage
  | ThoughtMessage;

/** 用户消息 */
export interface UserMessage {
  id: MessageId;
  role: 'user';
  content: string;
  createdAt: string;
}

/** 助手消息（支持流式累积） */
export interface AssistantMessage {
  id: MessageId;
  role: 'assistant';
  content: string;
  isStreaming: boolean;
  createdAt: string;
}

/** 系统消息 */
export interface SystemMessage {
  id: MessageId;
  role: 'system';
  content: string;
  createdAt: string;
}

/** 工具消息（工具调用和结果） */
export interface ToolMessage {
  id: MessageId;
  role: 'tool';
  toolInvocation: ToolInvocation;
  createdAt: string;
}

/** 权限请求消息（消息流中的权限请求卡片） */
export interface PermissionMessage {
  id: MessageId;
  role: 'permission';
  request: PermissionRequest;
  createdAt: string;
}

/** 错误消息 */
export interface ErrorMessage {
  id: MessageId;
  role: 'error';
  content: string;
  code?: string;
  createdAt: string;
}

/** 思考消息（agent_thought_chunk 流式累积） */
export interface ThoughtMessage {
  id: MessageId;
  role: 'thought';
  content: string;
  isStreaming: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// 工具调用
// ---------------------------------------------------------------------------

/** 工具调用标识 */
export type ToolInvocationId = string;

/** 工具调用状态 */
export type ToolInvocationStatus = 'in-progress' | 'completed' | 'failed';

/** 工具调用 */
export interface ToolInvocation {
  id: ToolInvocationId;
  toolName: string;
  /** 调用参数摘要 */
  argumentsSummary: string;
  status: ToolInvocationStatus;
  /** 工具结果（完成或失败后填充） */
  result: ToolResult | null;
}

/** 工具结果 */
export interface ToolResult {
  content: string;
  isError: boolean;
}

// ---------------------------------------------------------------------------
// 权限请求
// ---------------------------------------------------------------------------

/** 权限请求标识 */
export type PermissionRequestId = string;

/** 权限请求 */
export interface PermissionRequest {
  id: PermissionRequestId;
  toolName: string;
  /** 操作说明 */
  description: string;
  status: 'pending' | 'allowed' | 'denied';
}

// ---------------------------------------------------------------------------
// 工作区与配置
// ---------------------------------------------------------------------------

/** 工作目录 */
export interface Workspace {
  path: string;
}

/** Provider 配置摘要（只读展示用） */
export interface ProviderConfigSummary {
  provider: string;
  model: string;
}

// ---------------------------------------------------------------------------
// ACP 适配器接口
// ---------------------------------------------------------------------------

/**
 * ACP adapter 将 Goose ACP 通知转换为 RUI 产品层事件。
 *
 * 产品层组件只消费 AdapterEvent，不直接引用 ACP transport 类型。
 */
export type AdapterEvent =
  | { type: 'connection-state-changed'; state: ConnectionState }
  | { type: 'session-created'; sessionId: SessionId; workspace: Workspace }
  | { type: 'session-loaded'; sessionId: SessionId; messages: Message[] }
  | { type: 'session-list-updated'; sessions: SessionSummary[] }
  | { type: 'message-chunk'; sessionId: SessionId; messageId: MessageId; delta: string }
  | { type: 'message-complete'; sessionId: SessionId; messageId: MessageId }
  | { type: 'tool-call-started'; sessionId: SessionId; invocation: ToolInvocation }
  | { type: 'tool-call-updated'; sessionId: SessionId; invocationId: ToolInvocationId; status: ToolInvocationStatus }
  | { type: 'tool-result'; sessionId: SessionId; invocationId: ToolInvocationId; result: ToolResult }
  | { type: 'permission-requested'; sessionId: SessionId; request: PermissionRequest }
  | { type: 'permission-resolved'; sessionId: SessionId; requestId: PermissionRequestId; allowed: boolean }
  | { type: 'session-error'; sessionId: SessionId; message: string; code?: string }
  | { type: 'session-cancelled'; sessionId: SessionId }
  | { type: 'connection-interrupted'; sessionId: SessionId; messageId: MessageId | null }
  | { type: 'thought-chunk'; sessionId: SessionId; messageId: MessageId; delta: string }
  | { type: 'thought-complete'; sessionId: SessionId; messageId: MessageId };

/**
 * ACP adapter 接口契约。
 *
 * 实现类负责：
 * - 连接 Goose ACP 服务
 * - 将 ACP notification 转换为 AdapterEvent
 * - 发送产品层指令到 ACP（如发送消息、取消、响应权限）
 */
export interface AcpAdapter {
  /** 建立连接 */
  connect(config: AcpConnectionConfig): Promise<void>;
  /** 断开连接 */
  disconnect(): Promise<void>;
  /** 订阅适配器事件 */
  subscribe(listener: (event: AdapterEvent) => void): () => void;
  /** 创建新 Session */
  createSession(workspace: Workspace): Promise<SessionId>;
  /** 加载已有 Session */
  loadSession(sessionId: SessionId): Promise<void>;
  /** 获取 Session 列表 */
  listSessions(): Promise<SessionSummary[]>;
  /** 发送消息 */
  sendMessage(sessionId: SessionId, content: string): Promise<MessageId>;
  /** 取消当前生成 */
  cancelSession(sessionId: SessionId): Promise<void>;
  /**
   * 响应权限请求
   * @param scope 决策范围，默认 'once'（本次允许/拒绝）。保留 'always'
   * 扩展位供后续实现"始终允许/始终拒绝"策略。
   */
  respondToPermission(
    sessionId: SessionId,
    requestId: PermissionRequestId,
    allowed: boolean,
    scope?: 'once' | 'always',
  ): Promise<void>;
  /** 重连（断线恢复时调用） */
  reconnect?(): Promise<void>;
}

/** ACP 连接配置 */
export interface AcpConnectionConfig {
  /** ACP 服务地址 */
  endpoint: string;
  /** 可选 Secret Key */
  secretKey?: string;
  /** 工作目录 */
  workspace: string;
}
