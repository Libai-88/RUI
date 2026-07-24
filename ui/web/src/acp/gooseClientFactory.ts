import { GooseClient } from '@aaif/goose-sdk';
import { PROTOCOL_VERSION } from '@agentclientprotocol/sdk';
import type { RequestPermissionRequest, RequestPermissionResponse } from '@agentclientprotocol/sdk';
import type {
  AcpClient,
  AcpClientCallbacks,
  AcpPermissionRequestNotification,
  AcpSessionNotification,
} from './webAcpAdapter';

/** 从 ACP 权限请求的 toolCall.content 中提取文本说明作为 description */
function extractPermissionDescription(request: RequestPermissionRequest): string {
  for (const content of request.toolCall.content ?? []) {
    if (content.type === 'content' && content.content.type === 'text') {
      return content.content.text;
    }
  }
  return request.toolCall.title ?? '';
}

/** 将 SDK 的 RequestPermissionRequest 转换为 RUI adapter 需要的通知形状 */
function toPermissionNotification(
  request: RequestPermissionRequest,
): AcpPermissionRequestNotification {
  return {
    sessionId: request.sessionId,
    toolCallId: request.toolCall.toolCallId,
    toolName: request.toolCall.title || request.toolCall.toolCallId,
    description: extractPermissionDescription(request),
    options: request.options.map((o) => ({
      optionId: o.optionId,
      kind: o.kind,
      name: o.name,
    })),
  };
}

/** 将 RUI adapter 的决策转换回 SDK 期望的 RequestPermissionResponse */
function toPermissionResponse(optionId: string | null): RequestPermissionResponse {
  if (!optionId) {
    return { outcome: { outcome: 'cancelled' } };
  }
  return { outcome: { outcome: 'selected', optionId } };
}

export function createGooseClientFactory(): (
  baseUrl: string,
  callbacks: AcpClientCallbacks,
) => AcpClient {
  return (baseUrl: string, callbacks: AcpClientCallbacks) => {
    const client = new GooseClient(
      () => ({
        sessionUpdate: (notification) => {
          callbacks.onSessionUpdate?.(notification as AcpSessionNotification);
          return Promise.resolve();
        },
        requestPermission: async (request: RequestPermissionRequest) => {
          if (!callbacks.onPermissionRequest) {
            return { outcome: { outcome: 'cancelled' } };
          }
          const decision = await callbacks.onPermissionRequest(
            toPermissionNotification(request),
          );
          return toPermissionResponse(decision.optionId);
        },
      }),
      baseUrl,
    );

    void client
      .initialize({
        protocolVersion: PROTOCOL_VERSION,
        clientInfo: { name: 'rui-web', version: '0.1.0' },
        clientCapabilities: {},
      })
      .catch(() => {});

    client.closed
      .then(() => callbacks.onDisconnect?.('connection closed'))
      .catch(() => callbacks.onDisconnect?.('connection error'));

    return {
      newSession: (params) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        client.newSession(params as any) as Promise<{ sessionId: string | number }>,
      loadSession: (params) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        client.loadSession(params as any) as Promise<{ messages?: unknown[] }>,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      unstable_listSessions: (params) => client.listSessions(params as any) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sessionPrompt: (params) => client.prompt(params as any) as Promise<unknown>,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sessionCancel: (params) => client.cancel(params as any) as Promise<unknown>,
      sessionUpdate: (params) =>
        client.extMethod('session/update', params as Record<string, unknown>) as Promise<unknown>,
    };
  };
}
