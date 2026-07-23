import { GooseClient } from '@aaif/goose-sdk';
import { PROTOCOL_VERSION } from '@agentclientprotocol/sdk';
import type { AcpClient, AcpClientCallbacks, AcpSessionNotification } from './webAcpAdapter';

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
        requestPermission: () =>
          Promise.resolve({ outcome: { outcome: 'cancelled' } }),
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
