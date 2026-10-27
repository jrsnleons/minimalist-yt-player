'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { runSse, type SseStatus } from '@/lib/remote/sseClient';
import { forgetToken, getStoredToken, storeToken } from '@/lib/remote/tokenStore';
import type { RemoteCommand, RemoteState } from '@/lib/remote/types';

export type RemoteConnection = 'no-token' | 'connecting' | 'connected' | 'reconnecting' | 'host-offline' | 'invalid' | 'ended';

export type Optimistic = Partial<Pick<RemoteState, 'isPlaying' | 'volume' | 'isMuted' | 'shuffle' | 'repeat' | 'liked'>>;

const OPTIMISTIC_MS = 2500;

function vibrate() {
  try {
    navigator.vibrate?.(10);
  } catch {}
}

export function useRemoteClient(code: string) {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [sse, setSse] = useState<SseStatus>('connecting');
  const [hostOnline, setHostOnline] = useState(false);
  const [fatal, setFatal] = useState<'invalid' | 'ended' | null>(null);
  const [snap, setSnap] = useState<{ state: RemoteState; receivedAt: number } | null>(null);
  const [optimistic, setOptimistic] = useState<Optimistic>({});
  const optimisticTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Token: hash first (then strip it from the URL), else stored copy.
  useEffect(() => {
    const fromHash = new URLSearchParams(location.hash.replace(/^#/, '')).get('t');
    if (fromHash) {
      storeToken(code, fromHash);
      history.replaceState(null, '', location.pathname + location.search);
      setToken(fromHash);
    } else {
      setToken(getStoredToken(code));
    }
  }, [code]);

  useEffect(() => {
    if (!token) return;
    const ctrl = new AbortController();
    runSse({
      url: `/api/remote/${code}/events`,
      token,
      signal: ctrl.signal,
      onStatus: setSse,
      onEvent: (event, data) => {
        if (event === 'state') {
          setSnap({ state: data as RemoteState, receivedAt: performance.now() });
          setOptimistic({});
        } else if (event === 'presence') {
          setHostOnline(!!(data as { host?: boolean }).host);
        }
      },
      onFatal: (reason) => {
        if (reason === 'invalid') forgetToken(code);
        setFatal(reason);
      },
    });
    return () => ctrl.abort();
  }, [code, token]);

  // Keep the screen awake while the remote is open. Optional; ignored when unsupported.
  useEffect(() => {
    if (!token || fatal) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        if (document.visibilityState !== 'visible' || !navigator.wakeLock) return;
        const l = await navigator.wakeLock.request('screen');
        if (cancelled) l.release().catch(() => {});
        else lock = l;
      } catch {}
    };
    acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', acquire);
      lock?.release().catch(() => {});
    };
  }, [token, fatal]);

  const applyOptimistic = useCallback((patch: Optimistic) => {
    setOptimistic((o) => ({ ...o, ...patch }));
    if (optimisticTimer.current) clearTimeout(optimisticTimer.current);
    optimisticTimer.current = setTimeout(() => setOptimistic({}), OPTIMISTIC_MS);
  }, []);

  useEffect(() => () => {
    if (optimisticTimer.current) clearTimeout(optimisticTimer.current);
  }, []);

  const [sendError, setSendError] = useState<string | null>(null);

  const send = useCallback(
    async (command: RemoteCommand, opts?: { haptic?: boolean }) => {
      if (!token) return false;
      if (opts?.haptic !== false) vibrate();
      try {
        const res = await fetch(`/api/remote/${code}/command`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(command),
        });
        if (res.status === 401 || res.status === 404) {
          forgetToken(code);
          setFatal('invalid');
          return false;
        }
        if (res.status === 409) {
          setHostOnline(false);
          setSendError('Host is offline');
          return false;
        }
        if (!res.ok) throw new Error();
        setSendError(null);
        return true;
      } catch {
        setSendError('Command failed. Check the connection.');
        setOptimistic({});
        return false;
      }
    },
    [code, token]
  );

  const connection: RemoteConnection = useMemo(() => {
    if (token === undefined) return 'connecting';
    if (!token) return 'no-token';
    if (fatal) return fatal;
    if (sse === 'reconnecting') return 'reconnecting';
    if (sse === 'connecting') return 'connecting';
    return hostOnline ? 'connected' : 'host-offline';
  }, [token, fatal, sse, hostOnline]);

  const state: RemoteState | null = useMemo(
    () => (snap ? { ...snap.state, ...optimistic } : null),
    [snap, optimistic]
  );

  return {
    connection,
    state,
    receivedAt: snap?.receivedAt ?? 0,
    send,
    applyOptimistic,
    sendError,
    clearSendError: () => setSendError(null),
  };
}
