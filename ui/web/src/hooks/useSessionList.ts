import { useState, useEffect, useCallback, useRef } from 'react';
import type { AcpAdapter, SessionSummary, SessionId, SessionStatus } from '../product/types';

function updateSessionStatus(sessions: SessionSummary[], sessionId: SessionId, status: SessionStatus): SessionSummary[] {
  return sessions.map((s) => (s.id === sessionId ? { ...s, status } : s));
}

export interface UseSessionListResult {
  sessions: SessionSummary[];
  loading: boolean;
  activeSessionId: SessionId | null;
  loadingSessionId: SessionId | null;
  refresh: () => Promise<void>;
  selectSession: (sessionId: SessionId) => Promise<void>;
  createNewSession: () => Promise<SessionId | null>;
}

export function useSessionList(adapter: AcpAdapter | null): UseSessionListResult {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<SessionId | null>(null);
  const [loadingSessionId, setLoadingSessionId] = useState<SessionId | null>(null);
  const loadingRef = useRef<Set<SessionId>>(new Set());

  useEffect(() => {
    if (!adapter) return;
    setLoading(true);
    adapter
      .listSessions()
      .then((list) => setSessions(list))
      .catch(() => {
        // list failure is non-fatal
      })
      .finally(() => setLoading(false));

    return adapter.subscribe((event) => {
      if (event.type === 'session-list-updated') {
        setSessions(event.sessions);
      }
      if (event.type === 'session-created') {
        setActiveSessionId(event.sessionId);
        void adapter
          .listSessions()
          .then(setSessions)
          .catch(() => {});
      }
      if (event.type === 'message-chunk') {
        setSessions((prev) => updateSessionStatus(prev, event.sessionId, 'streaming'));
      }
      if (event.type === 'message-complete') {
        setSessions((prev) => updateSessionStatus(prev, event.sessionId, 'idle'));
      }
      if (event.type === 'permission-requested') {
        setSessions((prev) => updateSessionStatus(prev, event.sessionId, 'waiting-for-permission'));
      }
      if (event.type === 'permission-resolved') {
        setSessions((prev) => updateSessionStatus(prev, event.sessionId, 'streaming'));
      }
      if (event.type === 'session-cancelled') {
        setSessions((prev) => updateSessionStatus(prev, event.sessionId, 'idle'));
      }
      if (event.type === 'session-error') {
        setSessions((prev) => updateSessionStatus(prev, event.sessionId, 'error'));
      }
      if (event.type === 'connection-interrupted') {
        setSessions((prev) => updateSessionStatus(prev, event.sessionId, 'interrupted'));
      }
    });
  }, [adapter]);

  const refresh = useCallback(async () => {
    if (!adapter) return;
    setLoading(true);
    try {
      const list = await adapter.listSessions();
      setSessions(list);
    } finally {
      setLoading(false);
    }
  }, [adapter]);

  const selectSession = useCallback(
    async (sessionId: SessionId) => {
      if (!adapter) return;
      if (loadingRef.current.has(sessionId)) return;
      loadingRef.current.add(sessionId);
      setLoadingSessionId(sessionId);
      try {
        await adapter.loadSession(sessionId);
        setActiveSessionId(sessionId);
      } finally {
        loadingRef.current.delete(sessionId);
        setLoadingSessionId(null);
      }
    },
    [adapter],
  );

  const createNewSession = useCallback(async () => {
    if (!adapter) return null;
    setActiveSessionId(null);
    return null;
  }, [adapter]);

  return {
    sessions,
    loading,
    activeSessionId,
    loadingSessionId,
    refresh,
    selectSession,
    createNewSession,
  };
}
