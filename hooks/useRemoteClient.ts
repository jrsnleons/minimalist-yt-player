'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getTransport, type LinkStatus, type RemoteClientLink } from '@/lib/realtime/transport';
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
  const [sse, setSse] = useState<LinkStatus>('connecting');
  const linkRef = useRef<RemoteClientLink | null>(null);
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
    let cancelled = false;
    let link: RemoteClientLink | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      setSse('connecting');
      getTransport()
        .then((transport) => {
          if (cancelled) return;
          link = transport.connectRemoteClient(
            { code, token },
            {
              onStatus: setSse,
              onState: (state) => {
                setSnap({ state, receivedAt: performance.now() });
                setOptimistic({});
              },
              onHostOnline: setHostOnline,
              onFatal: (reason) => {
                if (reason === 'invalid') forgetToken(code);
                setFatal(reason);
              },
            }
          );
          linkRef.current = link;
        })
        .catch(() => {
          if (cancelled) return;
          setSse('reconnecting');
          retry = setTimeout(connect, 3000);
        });
    };
    connect();

    return () => {
      cancelled = true;
      if (retry) clearTimeout(retry);
      link?.close();
      if (linkRef.current === link) linkRef.current = null;
    };
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
      const result = await (linkRef.current?.sendCommand(command) ?? Promise.resolve('error' as const));
      if (result === 'invalid') {
        forgetToken(code);
        setFatal('invalid');
        return false;
      }
      if (result === 'offline') {
        setHostOnline(false);
        setSendError('Host is offline');
        return false;
      }
      if (result === 'error') {
        setSendError('Command failed. Check the connection.');
        setOptimistic({});
        return false;
      }
      setSendError(null);
      return true;
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
