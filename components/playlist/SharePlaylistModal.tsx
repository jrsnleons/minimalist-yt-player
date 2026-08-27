'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { usePlayerStore } from '@/store/usePlayerStore';
import { db } from '@/db/schema';
import { encodePlaylistForShare, generateQrCodeSvg } from '@/lib/share';
import { formatTime } from '@/lib/utils';
import { QrCode, Copy, Check, Share2, Music, AlertCircle, Loader2 } from 'lucide-react';
import type { Playlist, Track } from '@/types';

interface SharePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: Playlist;
  tracks?: Track[];
}

export function SharePlaylistModal({
  isOpen,
  onClose,
  playlist,
  tracks: initialTracks = [],
}: SharePlaylistModalProps) {
  const showToast = usePlayerStore((s) => s.showToast);
  const [copied, setCopied] = useState(false);
  const [qrSvg, setQrSvg] = useState<string>('');
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [resolvedTracks, setResolvedTracks] = useState<Track[]>(initialTracks);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    let isMounted = true;
    setIsLoading(true);
    setShareUrl('');
    setQrSvg('');

    const prepareAndEncode = async () => {
      let activeTracks = initialTracks;

      // If initialTracks is empty, load from IndexedDB
      if ((!activeTracks || activeTracks.length === 0) && playlist.trackIds && playlist.trackIds.length > 0) {
        try {
          const dbTracks = await db.tracks.bulkGet(playlist.trackIds);
          activeTracks = playlist.trackIds.map((id, i) => {
            const found = dbTracks[i];
            if (found) return found;
            return {
              id,
              title: `Track ${i + 1}`,
              artist: 'YouTube Audio',
              duration: 0,
              thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
              addedAt: Date.now(),
            };
          });
        } catch {
          activeTracks = [];
        }
      }

      if (!isMounted) return;
      setResolvedTracks(activeTracks);

      if (!activeTracks || activeTracks.length === 0) {
        setIsLoading(false);
        return;
      }

      try {
        const hash = await encodePlaylistForShare(playlist, activeTracks);
        if (!isMounted) return;

        const origin = window.location.origin || 'http://localhost:3000';
        const url = `${origin}/?s=${hash}`;
        setShareUrl(url);

        const svg = await generateQrCodeSvg(url);
        if (isMounted) {
          setQrSvg(svg);
        }
      } catch (err) {
        console.error('[Share] Failed to encode playlist:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    prepareAndEncode();
    setCopied(false);

    return () => {
      isMounted = false;
    };
  }, [isOpen, playlist, initialTracks]);

  const totalDuration = resolvedTracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  const isEmpty = !isLoading && resolvedTracks.length === 0;

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    let didCopy = false;

    if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        didCopy = true;
      } catch {
        didCopy = false;
      }
    }

    if (!didCopy && typeof document !== 'undefined') {
      try {
        const input = document.createElement('textarea');
        input.value = shareUrl;
        input.style.position = 'fixed';
        input.style.left = '-9999px';
        input.style.top = '-9999px';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.focus();
        input.select();
        didCopy = document.execCommand('copy');
        document.body.removeChild(input);
      } catch {
        didCopy = false;
      }
    }

    if (didCopy) {
      setCopied(true);
      showToast('Share link copied to clipboard! 📋');
      setTimeout(() => setCopied(false), 2500);
    } else {
      showToast('Please select and copy the link text directly');
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && 'share' in navigator && shareUrl) {
      try {
        await navigator.share({
          title: `${playlist.name} — Onyx Player`,
          text: `Check out "${playlist.name}" (${resolvedTracks.length} tracks) on Onyx Minimalist Player`,
          url: shareUrl,
        });
      } catch {
        // User cancelled or dismissed system sheet
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Playlist" className="max-w-md">
      <div className="space-y-4">
        {/* Playlist Summary Card */}
        <div className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-white/[0.08] bg-[#0c0c10]">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-white/[0.02] border border-white/10 flex items-center justify-center shrink-0">
            <Music size={22} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-white truncate tracking-tight">{playlist.name}</h4>
            <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
              {resolvedTracks.length} tracks · {formatTime(totalDuration)}
            </p>
          </div>
        </div>

        {/* Empty Playlist Notice */}
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] text-center">
            <AlertCircle size={24} className="text-amber-400 mb-2" />
            <h5 className="text-xs font-semibold text-white">This playlist has no songs yet</h5>
            <p className="text-[11px] text-zinc-400 mt-1 max-w-xs leading-relaxed">
              Add some tracks from Search, Queue, or Recently Played to generate a shareable link and QR code.
            </p>
          </div>
        ) : (
          <>
            {/* QR Code Section */}
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl border border-white/[0.08] bg-[#0c0c10]/70 text-center">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 mb-3">
                <QrCode size={15} className="text-white" />
                <span>Scan with Phone Camera</span>
              </div>

              <div className="p-3 bg-white rounded-2xl shadow-xl flex items-center justify-center">
                {isLoading ? (
                  <div className="w-40 h-40 flex flex-col items-center justify-center text-zinc-600 gap-2 font-mono text-xs">
                    <Loader2 size={20} className="animate-spin text-black" />
                    <span className="text-[11px] text-zinc-700">Generating QR…</span>
                  </div>
                ) : qrSvg ? (
                  <div
                    className="w-40 h-40 [&>svg]:w-full [&>svg]:h-full [&>svg]:text-black"
                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                  />
                ) : (
                  <div className="w-40 h-40 flex items-center justify-center text-zinc-400 font-mono text-xs">
                    Could not generate QR
                  </div>
                )}
              </div>

              <p className="text-[11px] text-zinc-500 mt-3 max-w-xs leading-relaxed">
                Scan with any phone camera to instantly stream or import this playlist with zero login.
              </p>
            </div>

            {/* Share URL Box & Buttons */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-zinc-400">Shareable Link</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  placeholder={isLoading ? 'Encoding playlist...' : ''}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="flex-1 px-3 py-2 text-xs font-mono rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-300 focus:border-white/30 truncate"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  disabled={isLoading || !shareUrl}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 disabled:opacity-40 transition-all shadow-sm cursor-pointer shrink-0 active:scale-95"
                >
                  {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Native Web Share fallback / button */}
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                type="button"
                onClick={handleNativeShare}
                disabled={isLoading || !shareUrl}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-medium transition-all cursor-pointer active:scale-98 disabled:opacity-40"
              >
                <Share2 size={14} />
                <span>Share via Device Sheet</span>
              </button>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
