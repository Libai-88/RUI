import { useMemo } from 'react';
import type { AcpAdapter, Message, PermissionMessage, PermissionRequest, SessionId, SessionStatus } from '../product/types';
import { useMessageStore } from './useMessageStore';
import { useSessionActions } from './useSessionActions';

export interface UseChatResult {
  messages: Message[];
  status: SessionStatus;
  sendMessage: (content: string) => Promise<void>;
  cancel: () => Promise<void>;
  reconnect: () => Promise<void>;
  resendLastMessage: () => Promise<void>;
  resolvePermission: (requestId: string, allowed: boolean, scope?: 'once' | 'always') => Promise<void>;
  pendingPermissions: PermissionRequest[];
}

/**
 * 会话对话 hook（facade）。
 *
 * 组合 useMessageStore（状态 + 订阅）和 useSessionActions（动作），
 * 并导出 pendingPermissions 派生。外部 API 与拆分前一致。
 */
export function useChat(
  adapter: AcpAdapter | null,
  sessionId: SessionId | null,
  initialMessages?: Message[],
): UseChatResult {
  const { messages, status, addMessage, setStatus } = useMessageStore(
    adapter,
    sessionId,
    initialMessages,
  );

  const { sendMessage, cancel, reconnect, resendLastMessage, resolvePermission } =
    useSessionActions({
      adapter,
      sessionId,
      messages,
      addMessage,
      setStatus,
    });

  const pendingPermissions = useMemo(
    () =>
      messages
        .filter((m): m is PermissionMessage => m.role === 'permission')
        .map((m) => m.request)
        .filter((r) => r.status === 'pending'),
    [messages],
  );

  return {
    messages,
    status,
    sendMessage,
    cancel,
    reconnect,
    resendLastMessage,
    resolvePermission,
    pendingPermissions,
  };
}
