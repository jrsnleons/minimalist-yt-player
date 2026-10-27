'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useTransferStore } from '@/store/useTransferStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { isAblyEnabled } from '@/lib/realtime/transport';
import { restoreFullLibrary } from '@/lib/backup';
import {
  parseTransferLink,
  startReceive,
  startSend,
  type ReceiveController,
  type ReceiveState,
  type SendController,
  type SendState,
} from '@/lib/transfer/transferClient';
import type { TransferSummary } from '@/lib/transfer/protocol';
import { cn } from '@/lib/utils';

const primaryBtn =
  'inline-flex items-center justify-center gap-2 min-h-[40px] px-4 rounded-lg bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';
const quietBtn =
  'inline-flex items-center justify-center gap-2 min-h-[40px] px-4 rounded-lg bg-white/[0.06] text-zinc-100 text-sm font-medium hover:bg-white/[0.1] transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

function plural(n: number, one: string, many = `${one}s`) {
  return `${n.toLocaleString()} ${n === 1 ? one : many}`;
}

function SummaryList({ summary }: { summary: TransferSummary }) {
  return (
    <dl className="grid grid-cols-3 gap-2 w-full text-center">
      {[
        ['Playlists', summary.playlistCount],
        ['Tracks', summary.trackCount],
        ['History', summary.historyCount],
      ].map(([label, value]) => (
        <div key={label} className="rounded-lg bg-white/[0.04] py-3">
          <dd className="text-lg font-semibold text-white tabular-nums">{(value as number).toLocaleString()}</dd>
          <dt className="text-xs text-zinc-400">{label}</dt>
        </div>
      ))}
    </dl>
  );
}

function Progress({ value, total, label }: { value: number; total: number; label: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="w-full flex flex-col gap-2" role="status" aria-live="polite">
      <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
        <div className="h-full bg-white transition-[width] duration-150" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-sm text-zinc-400">
        {label} {pct}%
      </p>
    </div>
  );
}

// ---------- Send ----------

function SendPanel({ onClose }: { onClose: () => void }) {
  const showToast = usePlayerStore((s) => s.showToast);
  const [state, setState] = useState<SendState>({ phase: 'starting' });
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const ctrl = useRef<SendController | null>(null);
  const link = 'link' in state ? state.link : null;

  useEffect(() => {
    const c = startSend(setState);
    ctrl.current = c;
    return () => c.cancel();
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!link) return;
    QRCode.toDataURL(link, { margin: 1, width: 480, errorCorrectionLevel: 'M', color: { dark: '#0b0b0e', light: '#ffffff' } })
      .then((url) => !cancelled && setQr(url))
      .catch(() => !cancelled && setQr(null));
    return () => {
      cancelled = true;
    };
  }, [link]);

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      showToast('Copy failed');
    }
  };

  if (state.phase === 'done') {
    return (
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <p className="text-base font-semibold text-white">Library Sent</p>
        <p className="text-sm text-zinc-400">The other device has the library.</p>
        <button type="button" onClick={onClose} className={primaryBtn}>Done</button>
      </div>
    );
  }

  if (state.phase === 'error') {
    return (
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <p role="alert" className="text-sm text-rose-300">{state.message}</p>
        <button type="button" onClick={onClose} className={quietBtn}>Close</button>
      </div>
    );
  }

  if (state.phase === 'asking') {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-sm text-zinc-300">Another device is asking for this library.</p>
        <SummaryList summary={state.summary} />
        <div className="grid grid-cols-2 gap-2 w-full">
          <button type="button" onClick={() => ctrl.current?.decline()} className={quietBtn}>Decline</button>
          <button type="button" onClick={() => ctrl.current?.approve()} className={primaryBtn}>Send</button>
        </div>
      </div>
    );
  }

  if (state.phase === 'sending') {
    return (
      <div className="flex flex-col items-center gap-4">
        <Progress value={state.sent} total={state.total} label="Sending" />
        <p className="text-sm text-zinc-400 text-center">Keep this window open until it finishes.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-zinc-400 text-center">
        Scan with the other device, or open the link there. Playlists, tracks and history are sent directly.
      </p>
      <div className="w-52 h-52 rounded-xl bg-white p-2 flex items-center justify-center">
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="QR code for library transfer" className="w-full h-full" />
        ) : (
          <Loader2 size={22} className="animate-spin text-zinc-500" aria-label="Preparing transfer" />
        )}
      </div>
      {'code' in state && (
        <p className="font-mono text-2xl tracking-[0.3em] text-white pl-[0.3em]" aria-label={`Code ${state.code.split('').join(' ')}`}>
          {state.code}
        </p>
      )}
      {state.phase === 'declined' && <p className="text-sm text-zinc-400">Request declined. Still waiting for a device.</p>}
      <div className="grid grid-cols-2 gap-2 w-full">
        <button type="button" onClick={copy} disabled={!link} className={quietBtn}>
          {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy Link'}
        </button>
        <button type="button" onClick={onClose} className={quietBtn}>Cancel</button>
      </div>
    </div>
  );
}

// ---------- Receive ----------

function ReceivePanel({ code, token, onClose }: { code: string; token: string; onClose: () => void }) {
  const showToast = usePlayerStore((s) => s.showToast);
  const [state, setState] = useState<ReceiveState>({ phase: 'connecting' });
  const [importing, setImporting] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const ctrl = useRef<ReceiveController | null>(null);

  useEffect(() => {
    const c = startReceive(code, token, setState);
    ctrl.current = c;
    return () => c.cancel();
  }, [code, token]);

  const runImport = useCallback(
    async (mode: 'merge' | 'replace') => {
      const backup = ctrl.current?.backup();
      if (!backup) return;
      setImporting(true);
      try {
        const result = await restoreFullLibrary(backup, mode);
        ctrl.current?.report(true);
        showToast(
          `${mode === 'replace' ? 'Replaced with' : 'Merged'} ${plural(result.restoredPlaylists, 'playlist')} and ${plural(result.restoredTracks, 'track')}`
        );
        onClose();
      } catch {
        ctrl.current?.report(false);
        showToast('Import failed');
        setImporting(false);
      }
    },
    [onClose, showToast]
  );

  if (state.phase === 'error') {
    return (
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <p role="alert" className="text-sm text-rose-300">{state.message}</p>
        <button type="button" onClick={onClose} className={quietBtn}>Close</button>
      </div>
    );
  }

  if (state.phase === 'review') {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-sm text-zinc-300">Received and verified. Choose how to add it to this device.</p>
        <SummaryList summary={state.summary} />
        <div className="w-full flex flex-col gap-2">
          <button type="button" disabled={importing} onClick={() => runImport('merge')} className={primaryBtn}>
            {importing && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            Merge
          </button>
          <p className="text-xs text-zinc-400">Keeps existing items and adds the received ones.</p>
          <button type="button" disabled={importing} onClick={() => setConfirmReplace(true)} className={quietBtn}>
            Replace
          </button>
          <p className="text-xs text-zinc-400">Deletes everything on this device first.</p>
        </div>
        <ConfirmModal
          isOpen={confirmReplace}
          onClose={() => setConfirmReplace(false)}
          onConfirm={() => runImport('replace')}
          title="Replace Library"
          description="All playlists, tracks and history on this device will be deleted and replaced with the received library."
          confirmText="Replace"
          cancelText="Cancel"
          isDestructive
        />
      </div>
    );
  }

  if (state.phase === 'receiving') {
    return <Progress value={state.received} total={state.total} label="Receiving" />;
  }

  return (
    <div className="flex flex-col items-center gap-3 py-4" role="status" aria-live="polite">
      <Loader2 size={20} className="animate-spin text-zinc-400" aria-hidden="true" />
      <p className="text-sm text-zinc-400">
        {state.phase === 'connecting' ? 'Connecting' : 'Waiting for the other device to approve'}
      </p>
    </div>
  );
}

function ReceiveEntry({ onStart }: { onStart: (c: { code: string; token: string }) => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const parsed = parseTransferLink(value);
        if (!parsed) return setError('Paste the full transfer link from the other device.');
        onStart(parsed);
      }}
    >
      <label htmlFor="transfer-link" className="text-sm text-zinc-300">
        Transfer link
      </label>
      <input
        id="transfer-link"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
        placeholder="Paste link"
        autoComplete="off"
        spellCheck={false}
        aria-invalid={!!error}
        aria-describedby={error ? 'transfer-link-error' : undefined}
        className="min-h-[44px] px-3 rounded-lg bg-white/[0.05] border border-white/[0.1] text-sm text-white placeholder:text-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      />
      {error && <p id="transfer-link-error" role="alert" className="text-sm text-rose-300">{error}</p>}
      <button type="submit" disabled={!value.trim()} className={primaryBtn}>Receive</button>
      <p className="text-xs text-zinc-400">Or scan the QR code on the other device with the camera.</p>
    </form>
  );
}

// ---------- Dialog ----------

export function TransferLibraryDialog() {
  const isOpen = useTransferStore((s) => s.isOpen);
  const tab = useTransferStore((s) => s.tab);
  const incoming = useTransferStore((s) => s.incoming);
  const setTab = useTransferStore((s) => s.setTab);
  const close = useTransferStore((s) => s.close);
  const openIncoming = useTransferStore((s) => s.openIncoming);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [manual, setManual] = useState<{ code: string; token: string } | null>(null);
  // Modal only calls showModal() when isOpen changes after it mounts. The palette can remount
  // this dialog while the store is already open, so open it one render later.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(isOpen), [isOpen]);

  // Opened from a link: /?transfer=CODE#t=SECRET
  useEffect(() => {
    const parsed = parseTransferLink(location.href);
    if (!parsed) return;
    history.replaceState(null, '', location.pathname);
    openIncoming(parsed);
  }, [openIncoming]);

  useEffect(() => {
    if (!isOpen) {
      setManual(null);
      return;
    }
    let cancelled = false;
    setAvailable(null);
    isAblyEnabled().then((ok) => !cancelled && setAvailable(ok));
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const session = incoming ?? manual;

  return (
    <Modal isOpen={isOpen && ready} onClose={close} title="Transfer Library" className="max-w-sm">
      {available === null ? (
        <div className="flex justify-center py-6">
          <Loader2 size={20} className="animate-spin text-zinc-400" aria-label="Checking" />
        </div>
      ) : available === false ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-zinc-300">
            Transfer needs a realtime connection, which is not set up on this server.
          </p>
          <p className="text-sm text-zinc-400">
            Export a JSON backup in Settings on one device, then import it on the other.
          </p>
          <button type="button" onClick={close} className={quietBtn}>Close</button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {!incoming && (
            <div role="tablist" aria-label="Transfer direction" className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-white/[0.04]">
              {(['send', 'receive'] as const).map((t) => (
                <button
                  key={t}
                  role="tab"
                  type="button"
                  aria-selected={tab === t}
                  onClick={() => {
                    setTab(t);
                    setManual(null);
                  }}
                  className={cn(
                    'min-h-[36px] rounded-md text-sm font-medium transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-white',
                    tab === t ? 'bg-white/[0.1] text-white' : 'text-zinc-400 hover:text-white'
                  )}
                >
                  {t === 'send' ? 'Send Library' : 'Receive Library'}
                </button>
              ))}
            </div>
          )}
          {tab === 'send' && !incoming ? (
            <SendPanel onClose={close} />
          ) : session ? (
            <ReceivePanel key={session.code} code={session.code} token={session.token} onClose={close} />
          ) : (
            <ReceiveEntry onStart={setManual} />
          )}
        </div>
      )}
    </Modal>
  );
}
