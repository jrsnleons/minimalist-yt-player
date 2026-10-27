'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useRemoteHostStore } from '@/store/useRemoteHostStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { cn } from '@/lib/utils';

export function ConnectPhoneModal() {
  const isOpen = useRemoteHostStore((s) => s.isModalOpen);
  const session = useRemoteHostStore((s) => s.session);
  const phones = useRemoteHostStore((s) => s.phones);
  const isCreating = useRemoteHostStore((s) => s.isCreating);
  const error = useRemoteHostStore((s) => s.error);
  const closeModal = useRemoteHostStore((s) => s.closeModal);
  const createSession = useRemoteHostStore((s) => s.createSession);
  const endSession = useRemoteHostStore((s) => s.endSession);
  const showToast = usePlayerStore((s) => s.showToast);

  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const link = session ? `${location.origin}/remote/${session.code}#t=${session.token}` : null;

  useEffect(() => {
    if (isOpen && !session) createSession();
  }, [isOpen, session, createSession]);

  useEffect(() => {
    let cancelled = false;
    if (!link) {
      setQr(null);
      return;
    }
    QRCode.toDataURL(link, { margin: 1, width: 480, errorCorrectionLevel: 'M', color: { dark: '#0b0b0e', light: '#ffffff' } })
      .then((url) => !cancelled && setQr(url))
      .catch(() => !cancelled && setQr(null));
    return () => {
      cancelled = true;
    };
  }, [link]);

  const copyLink = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      showToast('Copy failed');
    }
  };

  const handleEnd = async () => {
    await endSession();
    closeModal();
    showToast('Phone session ended');
  };

  const connected = phones > 0;

  return (
    <Modal isOpen={isOpen} onClose={closeModal} title="Connect Phone" className="max-w-sm">
      <div className="flex flex-col items-center gap-5">
        <p className="text-sm text-zinc-400 text-center">
          Scan with the phone camera to control playback from there.
        </p>

        <div className="w-52 h-52 rounded-2xl bg-white p-2 flex items-center justify-center">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt={`QR code for remote session ${session?.code}`} className="w-full h-full" />
          ) : error ? (
            <p className="text-xs text-zinc-700 text-center px-3">{error}</p>
          ) : (
            <Loader2 size={22} className="animate-spin text-zinc-500" aria-label="Creating session" />
          )}
        </div>

        {session && (
          <div className="text-center">
            <p className="text-xs text-zinc-400">Code</p>
            <p className="font-mono text-2xl tracking-[0.3em] text-white pl-[0.3em]" aria-label={`Code ${session.code.split('').join(' ')}`}>
              {session.code}
            </p>
          </div>
        )}

        <p
          role="status"
          className={cn(
            'flex items-center gap-2 text-sm px-3 min-h-[36px] rounded-full border',
            connected
              ? 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10'
              : 'text-zinc-400 border-white/10 bg-white/[0.04]'
          )}
        >
          <span className={cn('w-2 h-2 rounded-full', connected ? 'bg-emerald-400' : 'bg-zinc-500')} aria-hidden="true" />
          {connected ? (phones > 1 ? `${phones} Phones Connected` : 'Phone Connected') : 'Waiting for Phone'}
        </p>

        <div className="grid grid-cols-2 gap-2.5 w-full">
          <button
            type="button"
            onClick={copyLink}
            disabled={!link}
            className="flex items-center justify-center gap-2 min-h-[40px] rounded-xl border border-white/10 bg-white/[0.05] hover:bg-white/[0.09] text-sm font-medium text-zinc-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
            {copied ? 'Copied' : 'Copy Link'}
          </button>
          <button
            type="button"
            onClick={handleEnd}
            disabled={!session}
            className="min-h-[40px] rounded-xl bg-rose-600 hover:bg-rose-500 text-sm font-semibold text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            End Session
          </button>
        </div>
        <p className="text-xs text-zinc-400 text-center">
          If the phone keeps failing to connect, end the session and start a new one.
        </p>
      </div>
    </Modal>
  );
}
