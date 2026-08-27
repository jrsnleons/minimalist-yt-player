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
  SlidersHorizontal,
} from 'lucide-react';
import type { PlaybackMode, RestoreMode } from '@/types';

export function SettingsModal() {
  const settingsOpen = usePlayerStore((s) => s.settingsOpen);
  const closeSettings = usePlayerStore((s) => s.closeSettings);
  const playbackMode = usePlayerStore((s) => s.playbackMode);
  const setPlaybackMode = usePlayerStore((s) => s.setPlaybackMode);
  const crossfadeDuration = usePlayerStore((s) => s.crossfadeDuration);
  const setCrossfadeDuration = usePlayerStore((s) => s.setCrossfadeDuration);
  const blurredHeroBackground = usePlayerStore((s) => s.blurredHeroBackground);
  const toggleBlurredHeroBackground = usePlayerStore((s) => s.toggleBlurredHeroBackground);
  const ambientVisualizerEnabled = usePlayerStore((s) => s.ambientVisualizerEnabled);
  const toggleAmbientVisualizer = usePlayerStore((s) => s.toggleAmbientVisualizer);
  const sessionRestoreEnabled = usePlayerStore((s) => s.sessionRestoreEnabled);
  const toggleSessionRestore = usePlayerStore((s) => s.toggleSessionRestore);
  const loadRecentlyPlayed = usePlayerStore((s) => s.loadRecentlyPlayed);
  const showToast = usePlayerStore((s) => s.showToast);

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
    <Modal isOpen={settingsOpen} onClose={closeSettings} title="Onyx Settings & Preferences" className="max-w-xl">
      <div className="flex flex-col gap-5 max-h-[75vh] overflow-y-auto pr-1">
        {/* 1. Data Safety & Backup / Restore (Priority Section) */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white font-sans">
              Data Safety & Library Backups
            </h3>
          </div>

          <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#0c0c10] space-y-3 shadow-inner">
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Your entire library lives 100% locally in your browser. Export portable JSON backup files to safeguard your playlists or migrate to other computers.
            </p>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleExportBackup}
                disabled={isExporting}
                className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold transition-all shadow-sm cursor-pointer disabled:opacity-40"
              >
                {isExporting ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
                <span>Export Library (.json)</span>
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
                className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.16] text-zinc-200 text-xs font-medium transition-all cursor-pointer"
              >
                <Upload size={14} className="text-emerald-400" />
                <span>Restore Backup File</span>
              </button>
            </div>

            {/* Pending Restore Preview */}
            {fileValidation && fileValidation.isValid && (
              <div className="p-3.5 rounded-2xl bg-[#0e0e14] border border-emerald-500/30 space-y-3 mt-3">
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
                    className="text-[11px] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <span className="block font-mono font-bold text-white">
                      {fileValidation.summary?.playlistCount}
                    </span>
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Playlists</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <span className="block font-mono font-bold text-white">
                      {fileValidation.summary?.trackCount}
                    </span>
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Tracks</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <span className="block font-mono font-bold text-white">
                      {fileValidation.summary?.historyCount}
                    </span>
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider">History</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-zinc-300">Restore Strategy:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRestoreMode('merge')}
                      className={cn(
                        'p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer',
                        restoreMode === 'merge'
                          ? 'border-white/40 bg-white/[0.08] text-white'
                          : 'border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:border-white/[0.12]'
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
                        'p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer',
                        restoreMode === 'replace'
                          ? 'border-red-500/60 bg-red-950/40 text-white'
                          : 'border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:border-white/[0.12]'
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
                  className="w-full py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-40"
                >
                  {isRestoring ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>Confirm & Restore Library</span>
                </button>
              </div>
            )}

            {restoreError && (
              <div className="p-3 rounded-2xl bg-red-950/40 border border-red-900/60 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0 text-red-400" />
                <span>{restoreError}</span>
              </div>
            )}
          </div>
        </section>

        {/* 2. Visuals & Ambient Glow */}
        <section className="space-y-3 pt-2 border-t border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-white" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white font-sans">
              Visual & Player Ambiance
            </h3>
          </div>

          <div className="space-y-2.5">
            <div className="p-3.5 rounded-2xl border border-white/[0.06] bg-[#0c0c10] flex items-center justify-between gap-4">
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

            <div className="p-3.5 rounded-2xl border border-white/[0.06] bg-[#0c0c10] flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-white">Harmonic Audio Wave Visualizer</span>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                  Subtle, GPU-accelerated harmonic waveform canvas that reacts to playback and pause states.
                </p>
              </div>

              <button
                type="button"
                onClick={toggleAmbientVisualizer}
                aria-pressed={ambientVisualizerEnabled}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  ambientVisualizerEnabled ? 'bg-white' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow-lg ring-0 transition duration-200 ease-in-out ${
                    ambientVisualizerEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl border border-white/[0.06] bg-[#0c0c10] flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-white">Remember Session on Restart</span>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                  Automatically restores your active queue, track, and progress timestamp when reopening the app.
                </p>
              </div>

              <button
                type="button"
                onClick={toggleSessionRestore}
                aria-pressed={sessionRestoreEnabled}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  sessionRestoreEnabled ? 'bg-white' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow-lg ring-0 transition duration-200 ease-in-out ${
                    sessionRestoreEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* 3. Audio Crossfade & Transitions */}
        <section className="space-y-3 pt-2 border-t border-white/[0.06]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={15} className="text-white" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white font-sans">
                Audio Crossfade & Transitions
              </h3>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">
              {crossfadeDuration > 0 ? `${crossfadeDuration}s fade` : 'Disabled'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl border border-white/[0.06] bg-[#0c0c10] space-y-2.5">
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Smoothly blends consecutive songs by fading out the current track while fading in the next for uninterrupted flow.
            </p>
            <div className="flex items-center gap-1.5 pt-1">
              {[
                { label: 'Off', val: 0 },
                { label: '2s', val: 2 },
                { label: '3s', val: 3 },
                { label: '5s', val: 5 },
                { label: '8s', val: 8 },
                { label: '12s', val: 12 },
              ].map(({ label, val }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setCrossfadeDuration(val);
                    showToast(val > 0 ? `Crossfade set to ${val}s` : 'Crossfade disabled');
                  }}
                  className={cn(
                    'flex-1 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer text-center',
                    crossfadeDuration === val
                      ? 'bg-white text-black font-semibold shadow-sm'
                      : 'bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Playback Engine Selection */}
        <section className="space-y-3 pt-2 border-t border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Radio size={15} className="text-zinc-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white font-sans">
              Playback Engine
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {/* Mode 1 */}
            <label
              className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                playbackMode === 'iframe'
                  ? 'border-white/30 bg-white/[0.06] text-white shadow-sm'
                  : 'border-white/[0.06] bg-[#0c0c10] text-zinc-400 hover:border-white/[0.12] hover:text-zinc-300'
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
                  <span className="text-xs font-semibold text-white">YouTube IFrame Engine</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.1] text-white uppercase font-mono">
                    Recommended · Stable
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                  Headless iframe with custom transport. 100% YouTube TOS compliant. Supports live video on album cover (<kbd className="font-mono text-zinc-300">V</kbd>).
                </p>
              </div>
            </label>

            {/* Mode 2 */}
            <label
              className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                playbackMode === 'direct-audio'
                  ? 'border-white/30 bg-white/[0.06] text-white shadow-sm'
                  : 'border-white/[0.06] bg-[#0c0c10] text-zinc-400 hover:border-white/[0.12] hover:text-zinc-300'
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
                  <span className="text-xs font-semibold text-white">Direct Audio Streaming</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-300 uppercase font-mono">
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
            <div className="p-3.5 rounded-2xl border border-amber-900/60 bg-amber-950/20 text-amber-200/90 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                <AlertTriangle size={13} className="shrink-0" />
                <span>Direct Audio Mode Notes:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-200/80">
                <li>Stream URLs expire after ~6 hours (client auto-refetches).</li>
                <li>Live video mode is unavailable in direct audio mode.</li>
                <li>If stream extraction fails on specific tracks, IFrame fallback activates automatically.</li>
              </ul>
            </div>
          )}
        </section>

        {/* 4. Local Storage Stats & Reset */}
        <section className="space-y-3 pt-2 border-t border-white/[0.06]">
          <div className="flex items-center gap-2">
            <HardDrive size={15} className="text-zinc-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white font-sans">
              Local Storage Metrics
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 rounded-2xl border border-white/[0.06] bg-[#0c0c10]">
              <span className="block text-base font-semibold text-white font-mono">{trackCount}</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Saved Tracks</span>
            </div>
            <div className="p-3 rounded-2xl border border-white/[0.06] bg-[#0c0c10]">
              <span className="block text-base font-semibold text-white font-mono">{playlistCount}</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Playlists</span>
            </div>
            <div className="p-3 rounded-2xl border border-white/[0.06] bg-[#0c0c10]">
              <span className="block text-base font-semibold text-white font-mono">{historyCount}</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">History Plays</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl border border-white/[0.06] bg-[#0c0c10]">
            <div className="text-xs text-zinc-400">
              <span>Estimated Size: </span>
              <span className="text-white font-mono">{storageMB} MB</span>
            </div>
            <button
              onClick={handleClearDatabase}
              aria-label="Clear all local data"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-950/40 border border-red-900/50 transition-all cursor-pointer"
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
