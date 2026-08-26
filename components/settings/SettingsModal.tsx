'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { usePlayerStore } from '@/store/usePlayerStore';
import { db } from '@/db/schema';
import { estimateStorageMB } from '@/lib/utils';
import { AlertTriangle, HardDrive, Key, Radio, Trash2, Sparkles } from 'lucide-react';
import type { PlaybackMode } from '@/types';

export function SettingsModal() {
  const {
    settingsOpen,
    closeSettings,
    playbackMode,
    setPlaybackMode,
    blurredHeroBackground,
    toggleBlurredHeroBackground,
    showToast,
  } = usePlayerStore();

  const [storageMB, setStorageMB] = useState(0);
  const [trackCount, setTrackCount] = useState(0);
  const [playlistCount, setPlaylistCount] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);

  useEffect(() => {
    if (settingsOpen) {
      estimateStorageMB().then(setStorageMB);
      db.tracks.count().then(setTrackCount);
      db.playlists.count().then(setPlaylistCount);
      db.history.count().then(setHistoryCount);
    }
  }, [settingsOpen]);

  const handleModeChange = (mode: PlaybackMode) => {
    setPlaybackMode(mode);
    showToast(`Playback mode switched to ${mode === 'iframe' ? 'YouTube IFrame (Stable)' : 'Direct Audio (Experimental)'}`);
  };

  const handleClearDatabase = async () => {
    if (!confirm('Are you sure you want to delete all playlists, history, and cached tracks? This cannot be undone.')) {
      return;
    }
    try {
      await Promise.all([
        db.tracks.clear(),
        db.playlists.clear(),
        db.history.clear(),
        db.preferences.clear(),
      ]);
      setTrackCount(0);
      setPlaylistCount(0);
      setHistoryCount(0);
      setStorageMB(0);
      showToast('All local data cleared successfully');
      usePlayerStore.getState().clearQueue();
    } catch {
      showToast('Failed to clear database');
    }
  };

  return (
    <Modal isOpen={settingsOpen} onClose={closeSettings} title="Settings & Engine Preferences" className="max-w-xl">
      <div className="flex flex-col gap-5 max-h-[75vh] overflow-y-auto pr-1">
        {/* 1. Visuals & Ambient Glow */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-amber-300" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Visual & Player Ambiance
            </h3>
          </div>

          <div className="p-3.5 rounded-xl border border-[#27272f] bg-[#14141a] flex items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-white">Dynamic Blurred Artwork Glow</span>
              <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                Renders a dynamic, ultra-blurred ambient glow behind the music player matching the currently playing track.
              </p>
            </div>

            <button
              type="button"
              onClick={toggleBlurredHeroBackground}
              aria-pressed={blurredHeroBackground}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                blurredHeroBackground ? 'bg-white' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow-lg ring-0 transition duration-200 ease-in-out ${
                  blurredHeroBackground ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </section>

        {/* 2. Playback Engine Selection */}
        <section className="space-y-3 pt-2 border-t border-zinc-800">
          <div className="flex items-center gap-2">
            <Radio size={15} className="text-zinc-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Playback Engine
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {/* Mode 1 */}
            <label
              className={`flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                playbackMode === 'iframe'
                  ? 'border-white bg-zinc-800/80 text-white'
                  : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
              }`}
            >
              <input
                type="radio"
                name="playbackMode"
                value="iframe"
                checked={playbackMode === 'iframe'}
                onChange={() => handleModeChange('iframe')}
                className="mt-1"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-white">YouTube IFrame API</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-200 uppercase font-mono-time">
                    Default · Stable
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                  Headless iframe with custom transport. 100% YouTube TOS compliant. Supports draggable in-app Video PiP mode (<kbd className="font-mono-time text-zinc-300">V</kbd>).
                </p>
              </div>
            </label>

            {/* Mode 2 */}
            <label
              className={`flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                playbackMode === 'direct-audio'
                  ? 'border-white bg-zinc-800/80 text-white'
                  : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
              }`}
            >
              <input
                type="radio"
                name="playbackMode"
                value="direct-audio"
                checked={playbackMode === 'direct-audio'}
                onChange={() => handleModeChange('direct-audio')}
                className="mt-1"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-white">Direct Audio Streaming</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/50 border border-amber-700/50 text-amber-300 uppercase font-mono-time">
                    Experimental
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                  Streams audio into a native HTML5 <code className="text-zinc-300">&lt;audio&gt;</code> element without iframe container overhead.
                </p>
              </div>
            </label>
          </div>

          {/* Caveats for Direct Audio Mode */}
          {playbackMode === 'direct-audio' && (
            <div className="p-3 rounded-xl border border-amber-900/60 bg-amber-950/20 text-amber-200/90 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                <AlertTriangle size={13} className="shrink-0" />
                <span>Direct Audio Mode Notes:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-200/80">
                <li>Stream URLs expire after ~6 hours (client auto-refetches).</li>
                <li>Video PiP mode is disabled in direct audio mode.</li>
                <li>If stream extraction fails on specific tracks, IFrame fallback activates automatically.</li>
              </ul>
            </div>
          )}
        </section>

        {/* 3. Fallback API Configuration */}
        <section className="space-y-3 pt-2 border-t border-zinc-800">
          <div className="flex items-center gap-2">
            <Key size={15} className="text-zinc-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Search & Metadata Fallback
            </h3>
          </div>
          <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/40 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-zinc-300 font-medium">Primary Discovery Engine:</span>
              <span className="text-zinc-200 font-mono-time text-[11px] px-2 py-0.5 rounded bg-zinc-800">youtubei.js (Innertube)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-300 font-medium">Data API v3 Fallback:</span>
              <span className="text-zinc-400 font-mono-time text-[11px] px-2 py-0.5 rounded bg-zinc-800">Optional (.env.local)</span>
            </div>
          </div>
        </section>

        {/* 4. Local Storage & Data Management */}
        <section className="space-y-3 pt-2 border-t border-zinc-800">
          <div className="flex items-center gap-2">
            <HardDrive size={15} className="text-zinc-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Local Browser Database (IndexedDB)
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/40">
              <span className="block text-base font-semibold text-white font-mono-time">{trackCount}</span>
              <span className="text-[10px] text-zinc-500 uppercase">Saved Tracks</span>
            </div>
            <div className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/40">
              <span className="block text-base font-semibold text-white font-mono-time">{playlistCount}</span>
              <span className="text-[10px] text-zinc-500 uppercase">Playlists</span>
            </div>
            <div className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/40">
              <span className="block text-base font-semibold text-white font-mono-time">{historyCount}</span>
              <span className="text-[10px] text-zinc-500 uppercase">History Plays</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/30">
            <div className="text-xs text-zinc-400">
              <span>Estimated Storage: </span>
              <span className="text-white font-mono-time">{storageMB} MB</span>
            </div>
            <button
              onClick={handleClearDatabase}
              aria-label="Clear all local data"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-950/40 border border-red-900/50 transition-colors cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Clear Local Data</span>
            </button>
          </div>
        </section>
      </div>
    </Modal>
  );
}
