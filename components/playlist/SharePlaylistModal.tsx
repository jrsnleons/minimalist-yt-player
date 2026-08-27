'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { usePlayerStore } from '@/store/usePlayerStore';
import { encodePlaylistForShare, generateQrCodeSvg } from '@/lib/share';
import { formatTime } from '@/lib/utils';
import { QrCode, Copy, Check, Share2, Music, ExternalLink } from 'lucide-react';
import type { Playlist, Track } from '@/types';

interface SharePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: Playlist;
  tracks: Track[];
}

export function SharePlaylistModal({
  isOpen,
  onClose,
  playlist,
  tracks,
}: SharePlaylistModalProps) {
  const showToast = usePlayerStore((s) => s.showToast);
  const [copied, setCopied] = useState(false);
  const [qrSvg, setQrSvg] = useState<string>('');
  const [shareUrl, setShareUrl] = useState<string>('');

  const totalDuration = tracks.reduce((acc, t) => acc + (t.duration || 0), 0);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    let isMounted = true;
    encodePlaylistForShare(playlist, tracks).then(async (hash) => {
      if (!isMounted) return;
      const url = `${window.location.origin}/?s=${hash}`;
      setShareUrl(url);

      const svg = await generateQrCodeSvg(url);
      if (isMounted) {
        setQrSvg(svg);
      }
    });
    setCopied(false);

    return () => {
      isMounted = false;
    };
  }, [isOpen, playlist, tracks]);

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      showToast('Share link copied to clipboard! 📋');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast('Could not copy to clipboard');
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${playlist.name} - Onyx Player`,
          text: `Check out "${playlist.name}" (${tracks.length} tracks) on Onyx Minimalist Player`,
          url: shareUrl,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Playlist" className="max-w-md">
      <div className="space-y-5">
        {/* Playlist Summary Card */}
        <div className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-white/[0.08] bg-[#0c0c10]">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-white/[0.02] border border-white/10 flex items-center justify-center shrink-0">
            <Music size={22} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-white truncate tracking-tight">{playlist.name}</h4>
            <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
              {tracks.length} tracks · {formatTime(totalDuration)}
            </p>
          </div>
        </div>

        {/* QR Code Section */}
        <div className="flex flex-col items-center justify-center p-5 rounded-2xl border border-white/[0.08] bg-[#0c0c10]/70 text-center">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 mb-3">
            <QrCode size={15} className="text-white" />
            <span>Scan with Phone Camera</span>
          </div>

          <div className="p-3.5 bg-white rounded-2xl shadow-xl flex items-center justify-center">
            {qrSvg ? (
              <div
                className="w-44 h-44 [&>svg]:w-full [&>svg]:h-full [&>svg]:text-black"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            ) : (
              <div className="w-44 h-44 flex items-center justify-center text-zinc-400 font-mono text-xs">
                Generating QR…
              </div>
            )}
          </div>

          <p className="text-[11px] text-zinc-500 mt-3 max-w-xs leading-relaxed">
            Anyone scanning this QR code can instantly listen or import this playlist with zero login or setup required.
          </p>
        </div>

        {/* Share URL Box & Buttons */}
        <div className="space-y-2">
          <label className="text-[11px] font-medium text-zinc-400">Shareable Link</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="flex-1 px-3 py-2 text-xs font-mono rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-300 focus:border-white/30 truncate"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-all shadow-sm cursor-pointer shrink-0"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Native Web Share fallback / button */}
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button
            type="button"
            onClick={handleNativeShare}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-medium transition-all cursor-pointer"
          >
            <Share2 size={14} />
            <span>Share via System Dialog</span>
          </button>
        )}
      </div>
    </Modal>
  );
}
