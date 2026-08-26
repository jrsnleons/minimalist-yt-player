'use client';

import { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { usePlayerStore } from '@/store/usePlayerStore';
import { db } from '@/db/schema';
import { estimateStorageMB, cn } from '@/lib/utils';
import {
  exportFullLibrary,
  validateBackup,
  restoreFullLibrary,
  type ValidationResult,
} from '@/lib/backup';
import {
  AlertTriangle,
  HardDrive,
  Key,
  Radio,
  Trash2,
  Sparkles,
  ShieldCheck,
  FileDown,
  Upload,
  Layers,
  RefreshCw,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type { PlaybackMode, RestoreMode } from '@/types';

export function SettingsModal() {
  const {
    settingsOpen,
    closeSettings,
    playbackMode,
    setPlaybackMode,
    blurredHeroBackground,
    toggleBlurredHeroBackground,
    loadRecentlyPlayed,
    showToast,
  } = usePlayerStore();

  const [storageMB, setStorageMB] = useState(0);
  const [trackCount, setTrackCount] = useState(0);
  const [playlistCount, setPlaylistCount] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);

  // Backup & Restore State
  const [isExporting, setIsExporting] = useState(false);
  const [fileValidation, setFileValidation] = useState<ValidationResult | null>(null);
  const [restoreMode, setRestoreMode] = useState<RestoreMode>('merge');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshStats = async () => {
    estimateStorageMB().then(setStorageMB);
    db.tracks.count().then(setTrackCount);
    db.playlists.count().then(setPlaylistCount);
    db.history.count().then(setHistoryCount);
  };

  useEffect(() => {
    if (settingsOpen) {
      refreshStats();
      setFileValidation(null);
      setRestoreError(null);
    }
  }, [settingsOpen]);

  const handleModeChange = (mode: PlaybackMode) => {
    setPlaybackMode(mode);
    showToast(
      `Playback mode switched to ${mode === 'iframe' ? 'YouTube IFrame (Stable)' : 'Direct Audio (Experimental)'}`
    );
  };

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const backup = await exportFullLibrary();
      showToast(
        `Exported backup with ${backup.summary.playlistCount} playlists & ${backup.summary.trackCount} tracks!`
      );
    } catch (err: any) {
      console.error('Export error:', err);
      showToast('Failed to export library backup');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreError(null);
    setFileValidation(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const validation = validateBackup(parsed);
        if (!validation.isValid) {
          setRestoreError(validation.error || 'Invalid backup file');
        } else {
          setFileValidation(validation);
        }
      } catch {
        setRestoreError('Invalid JSON format. Please select a valid .json file.');
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = async () => {
    if (!fileValidation || !fileValidation.isValid || !fileValidation.parsedData) return;
    setIsRestoring(true);
    setRestoreError(null);

    try {
      const res = await restoreFullLibrary(fileValidation.parsedData as any, restoreMode);
      await refreshStats();
      await loadRecentlyPlayed();
      showToast(
        `Successfully restored ${res.restoredPlaylists} playlists & ${res.restoredTracks} tracks!`
      );
      setFileValidation(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      console.error('Restore error:', err);
      setRestoreError(err.message || 'Failed to restore backup');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleClearDatabase = async () => {
    if (
      !confirm(
        'Are you sure you want to delete all playlists, history, and cached tracks? This cannot be undone. Make sure to export a backup first!'
      )
    ) {
      return;
    }
    try {
      await Promise.all([
        db.tracks.clear(),
        db.playlists.clear(),
        db.history.clear(),
        db.preferences.clear(),
      ]);
      await refreshStats();
      showToast('All local data cleared successfully');
      usePlayerStore.getState().clearQueue();
    } catch {
      showToast('Failed to clear database');
    }
  };

  return (
    <Modal isOpen={settingsOpen} onClose={closeSettings} title="Settings & Engine Preferences" className="max-w-xl">
      <div className="flex flex-col gap-5 max-h-[75vh] overflow-y-auto pr-1">
        {/* 1. Data Safety & Backup / Restore (Priority Section) */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Data Safety & Library Backups
            </h3>
          </div>

          <div className="p-4 rounded-xl border border-zinc-800 bg-[#121218] space-y-3">
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Your entire library lives 100% locally in your browser. Export portable JSON backup files to safeguard your playlists or migrate to other computers.
            </p>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleExportBackup}
                disabled={isExporting}
                className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-40"
              >
                {isExporting ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
                <span>Export Full Library (.json)</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelect}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#1c1c24] hover:bg-[#252530] border border-zinc-700 text-zinc-200 text-xs font-semibold transition-all cursor-pointer"
              >
                <Upload size={14} className="text-emerald-400" />
                <span>Restore Backup File</span>
              </button>
            </div>

            {/* Pending Restore Preview */}
            {fileValidation && fileValidation.isValid && (
              <div className="p-3.5 rounded-xl bg-[#181820] border border-emerald-800/60 space-y-3 mt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                    <Check size={13} />
                    <span>Backup Verified Ready to Restore</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFileValidation(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-[11px] text-zinc-500 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-lg bg-[#111116] border border-zinc-800">
                    <span className="block font-mono-time font-bold text-white">
                      {fileValidation.summary?.playlistCount}
                    </span>
                    <span className="text-[9px] text-zinc-500 uppercase">Playlists</span>
                  </div>
                  <div className="p-2 rounded-lg bg-[#111116] border border-zinc-800">
                    <span className="block font-mono-time font-bold text-white">
                      {fileValidation.summary?.trackCount}
                    </span>
                    <span className="text-[9px] text-zinc-500 uppercase">Tracks</span>
                  </div>
                  <div className="p-2 rounded-lg bg-[#111116] border border-zinc-800">
                    <span className="block font-mono-time font-bold text-white">
                      {fileValidation.summary?.historyCount}
                    </span>
                    <span className="text-[9px] text-zinc-500 uppercase">History</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-zinc-300">Restore Mode:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRestoreMode('merge')}
                      className={cn(
                        'p-2 rounded-lg border text-left text-xs transition-all cursor-pointer',
                        restoreMode === 'merge'
                          ? 'border-white bg-[#22222c] text-white'
                          : 'border-zinc-800 bg-[#14141a] text-zinc-400 hover:border-zinc-700'
                      )}
                    >
                      <div className="flex items-center gap-1.5 font-semibold">
                        <Layers size={12} />
                        <span>Merge (Safe)</span>
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Keep existing playlists</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRestoreMode('replace')}
                      className={cn(
                        'p-2 rounded-lg border text-left text-xs transition-all cursor-pointer',
                        restoreMode === 'replace'
                          ? 'border-red-500 bg-red-950/30 text-white'
                          : 'border-zinc-800 bg-[#14141a] text-zinc-400 hover:border-zinc-700'
                      )}
                    >
                      <div className="flex items-center gap-1.5 font-semibold text-red-400">
                        <RefreshCw size={12} />
                        <span>Full Replace</span>
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Wipe & replace</p>
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleExecuteRestore}
                  disabled={isRestoring}
                  className="w-full py-2 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-40"
                >
                  {isRestoring ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>Confirm & Restore Library</span>
                </button>
              </div>
            )}

            {restoreError && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-900/60 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0 text-red-400" />
                <span>{restoreError}</span>
              </div>
            )}
          </div>
        </section>

        {/* 2. Visuals & Ambient Glow */}
        <section className="space-y-3 pt-2 border-t border-zinc-800">
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

        {/* 3. Playback Engine Selection */}
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

        {/* 4. Local Storage Stats & Reset */}
        <section className="space-y-3 pt-2 border-t border-zinc-800">
          <div className="flex items-center gap-2">
            <HardDrive size={15} className="text-zinc-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Database Storage Metrics
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
              <span>Estimated Size: </span>
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
