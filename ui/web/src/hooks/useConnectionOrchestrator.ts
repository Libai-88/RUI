import { useState, useEffect, useMemo, useCallback } from 'react';
import type { AcpConnectionConfig, SessionId, PermissionRequest } from '../product/types';
import { WebAcpAdapter } from '../acp/webAcpAdapter';
import { createGooseClientFactory } from '../acp/gooseClientFactory';
import { useSessionList } from './useSessionList';

type ConnectionState = 'connecting' | 'connected' | 'error';

export interface ConnectionOrchestrationResult {
  adapter: WebAcpAdapter;
  connectionState: ConnectionState;
  sessionList: ReturnType<typeof useSessionList>;
  forceNewSession: boolean;
  createNewSession: () => void;
  selectSession: (sessionId: SessionId) => void;
  retry: () => void;
  pendingPermissions: PermissionRequest[];
  resolvePermission: (requestId: string, allowed: boolean, scope?: 'once' | 'always') => Promise<void>;
  handlePendingPermissionsChange: (
    perms: PermissionRequest[],
    resolver: (requestId: string, allowed: boolean, scope?: 'once' | 'always') => Promise<void>,
  ) => void;
}

export function useConnectionOrchestrator(config: AcpConnectionConfig): ConnectionOrchestrationResult {
  const adapter = useMemo(() => new WebAcpAdapter(createGooseClientFactory()), []);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [retryKey, setRetryKey] = useState(0);
  const [forceNewSession, setForceNewSession] = useState(false);
  const [pendingPermissions, setPendingPermissions] = useState<PermissionRequest[]>([]);
  const [resolvePermission, setResolvePermission] = useState<
    (requestId: string, allowed: boolean, scope?: 'once' | 'always') => Promise<void>
  >(async () => {});

  useEffect(() => {
    let cancelled = false;
    setConnectionState('connecting');
    adapter
      .connect(config)
      .then(() => {
        if (!cancelled) setConnectionState('connected');
      })
      .catch(() => {
        if (!cancelled) setConnectionState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [adapter, config, retryKey]);

  const sessionList = useSessionList(connectionState === 'connected' ? adapter : null);

  const handlePendingPermissionsChange = useCallback(
    (
      perms: PermissionRequest[],
      resolver: (requestId: string, allowed: boolean, scope?: 'once' | 'always') => Promise<void>,
    ) => {
      setPendingPermissions(perms);
      setResolvePermission(() => resolver);
    },
    [],
  );

  const createNewSession = useCallback(() => {
    setForceNewSession(true);
    void sessionList.createNewSession();
  }, [sessionList]);

  const selectSession = useCallback(
    (sessionId: SessionId) => {
      setForceNewSession(false);
      void sessionList.selectSession(sessionId);
    },
    [sessionList],
  );

  const retry = useCallback(() => {
    setRetryKey((k) => k + 1);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        createNewSession();
        document
          .querySelector<HTMLButtonElement>('[data-shortcut="new-session"]')
          ?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createNewSession]);

  return {
    adapter,
    connectionState,
    sessionList,
    forceNewSession,
    createNewSession,
    selectSession,
    retry,
    pendingPermissions,
    resolvePermission,
    handlePendingPermissionsChange,
  };
}
