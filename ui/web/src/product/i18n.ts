/**
 * RUI i18n 框架
 *
 * 中文为主语言，英文扩展结构就绪。
 * 通过 t() 获取当前语言的消息；通过 setLocale() 切换语言。
 * 新增消息在对应语言的 Record 中添加即可。
 */

// ---------------------------------------------------------------------------
// 语言与类型
// ---------------------------------------------------------------------------

export type Locale = 'zh-CN' | 'en';

/** i18n 消息键值对 */
export type Messages = Record<string, string>;

// ---------------------------------------------------------------------------
// 消息定义
// ---------------------------------------------------------------------------

const zh: Messages = {
  // App
  'header.title': 'RUI',
  'app.loading': '正在连接…',
  'connection.error.title': '连接 ACP 服务失败',
  'connection.error.retry': '重试',

  // 连接向导
  'connection.wizard.title': '连接到 ACP 服务',
  'connection.wizard.endpoint.label': 'ACP 地址',
  'connection.wizard.secretKey.label': 'Secret Key（可选）',
  'connection.wizard.secretKey.placeholder': '留空表示无认证',
  'connection.wizard.workspace.label': '工作目录',
  'connection.wizard.test': '测试连接',
  'connection.wizard.testing': '测试中…',
  'connection.wizard.connect': '直接连接',
  'connection.wizard.endpoint.empty': '请输入 ACP 地址',

  // Session
  'session.new': '新建会话',
  'session.refresh': '刷新',
  'session.empty': '暂无会话',
  'session.unnamed': '未命名会话',
  'session.loading': '加载中…',
  'session.status.idle': '空闲',
  'session.status.streaming': '生成中',
  'session.status.waiting-permission': '待权限',
  'session.status.cancelled': '已取消',
  'session.status.error': '错误',
  'session.status.interrupted': '已中断',

  // Chat
  'chat.creating': '正在创建会话…',
  'chat.create.failed': '会话创建失败：',
  'chat.workspace.label': '工作目录：{path}',
  'chat.input.placeholder': '输入消息，Enter 发送，Shift+Enter 换行',
  'chat.input.placeholder.waiting': '等待权限确认后可继续发送…',
  'chat.send': '发送',
  'chat.cancel': '取消',
  'chat.retry': '重试',

  // 断线恢复
  'chat.recovery.title': '连接已中断，已接收内容已保留',
  'chat.recovery.continue': '从断点继续',
  'chat.recovery.reconnect': '重连',
  'chat.recovery.resend': '重新发送',

  // 上下文区
  'context.section.workspace': '工作区',
  'context.workspace.path': '路径',
  'context.section.provider': 'Provider',
  'context.provider.name': 'Provider',
  'context.provider.model': '模型',
  'context.provider.edit': '配置编辑',
  'context.provider.unknown': '待获取',
  'context.section.connection': '连接状态',
  'context.connection.connected': '已连接',
  'context.connection.connecting': '连接中…',
  'context.connection.failed': '连接失败',
  'context.section.permissions': '待处理权限',
  'context.permissions.none': '无待处理权限',
  'context.section.extensions': '扩展',
  'context.extensions.mcp': 'MCP 扩展',
  'context.extensions.recipe': 'Recipe',
  'context.coming.soon': '即将推出',

  // 权限按钮
  'permission.allow': '允许',
  'permission.always.allow': '始终允许',
  'permission.deny': '拒绝',
  'permission.always.deny': '始终拒绝',

  // 左栏面板
  'panel.left.collapse': '收起左栏',
  'panel.left.expand': '展开左栏',
  'panel.right.collapse': '收起右栏',
  'panel.right.expand': '展开右栏',
};

const en: Messages = {
  'header.title': 'RUI',
  'app.loading': 'Connecting…',
  'connection.error.title': 'Failed to connect to ACP service',
  'connection.error.retry': 'Retry',

  'connection.wizard.title': 'Connect to ACP Service',
  'connection.wizard.endpoint.label': 'ACP Endpoint',
  'connection.wizard.secretKey.label': 'Secret Key (optional)',
  'connection.wizard.secretKey.placeholder': 'Leave empty for no auth',
  'connection.wizard.workspace.label': 'Working Directory',
  'connection.wizard.test': 'Test Connection',
  'connection.wizard.testing': 'Testing…',
  'connection.wizard.connect': 'Connect Directly',
  'connection.wizard.endpoint.empty': 'Please enter an ACP endpoint',

  'session.new': 'New Session',
  'session.refresh': 'Refresh',
  'session.empty': 'No sessions',
  'session.unnamed': 'Unnamed session',
  'session.loading': 'Loading…',
  'session.status.idle': 'Idle',
  'session.status.streaming': 'Streaming',
  'session.status.waiting-permission': 'Waiting',
  'session.status.cancelled': 'Cancelled',
  'session.status.error': 'Error',
  'session.status.interrupted': 'Interrupted',

  'chat.creating': 'Creating session…',
  'chat.create.failed': 'Session creation failed: ',
  'chat.workspace.label': 'Workspace: {path}',
  'chat.input.placeholder': 'Type a message, Enter to send, Shift+Enter for newline',
  'chat.input.placeholder.waiting': 'Waiting for permission to continue…',
  'chat.send': 'Send',
  'chat.cancel': 'Cancel',
  'chat.retry': 'Retry',

  'chat.recovery.title': 'Connection interrupted, received content preserved',
  'chat.recovery.continue': 'Continue from breakpoint',
  'chat.recovery.reconnect': 'Reconnect',
  'chat.recovery.resend': 'Resend',

  'context.section.workspace': 'Workspace',
  'context.workspace.path': 'Path',
  'context.section.provider': 'Provider',
  'context.provider.name': 'Provider',
  'context.provider.model': 'Model',
  'context.provider.edit': 'Edit Config',
  'context.provider.unknown': 'Pending',
  'context.section.connection': 'Connection',
  'context.connection.connected': 'Connected',
  'context.connection.connecting': 'Connecting…',
  'context.connection.failed': 'Connection failed',
  'context.section.permissions': 'Permissions',
  'context.permissions.none': 'No pending permissions',
  'context.section.extensions': 'Extensions',
  'context.extensions.mcp': 'MCP Extensions',
  'context.extensions.recipe': 'Recipe',
  'context.coming.soon': 'Coming soon',

  'permission.allow': 'Allow',
  'permission.always.allow': 'Always Allow',
  'permission.deny': 'Deny',
  'permission.always.deny': 'Always Deny',

  'panel.left.collapse': 'Collapse left panel',
  'panel.left.expand': 'Expand left panel',
  'panel.right.collapse': 'Collapse right panel',
  'panel.right.expand': 'Expand right panel',
};

// ---------------------------------------------------------------------------
// 注册表
// ---------------------------------------------------------------------------

const registry: Record<Locale, Messages> = { 'zh-CN': zh, en };

// ---------------------------------------------------------------------------
// 当前语言（默认中文）
// ---------------------------------------------------------------------------

let currentLocale: Locale = 'zh-CN';

/** 获取当前语言 */
export function getLocale(): Locale {
  return currentLocale;
}

/** 切换语言 */
export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

/** 获取消息，支持模板参数 {key} */
export function t(key: string, params?: Record<string, string>): string {
  let msg = registry[currentLocale]?.[key] ?? registry['zh-CN']?.[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      msg = msg.replace(`{${k}}`, v);
    }
  }
  return msg;
}

/** 获取原始消息注册表（供测试使用） */
export function getMessages(locale: Locale): Messages {
  return registry[locale] ?? registry['zh-CN'];
}
