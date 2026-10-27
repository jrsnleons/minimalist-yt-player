'use client';

import { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { SwitchRow } from '@/components/ui/Switch';
import { primaryBtn, ghostBtn, quietBtn, dangerBtn } from '@/lib/ui';
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
  Trash2,
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
  const [showClearConfirm, setShowClearConfirm] = useState(false);
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
      `Playback switched to ${mode === 'iframe' ? 'YouTube Player' : 'Direct Audio'}`
    );
  };

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const backup = await exportFullLibrary();
      showToast(
        `Exported ${backup.summary.playlistCount} playlists and ${backup.summary.trackCount} songs`
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
        setRestoreError('Not a valid JSON file. Select a backup exported from Onyx.');
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
        `Restored ${res.restoredPlaylists} playlists and ${res.restoredTracks} songs`
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
    try {
      await Promise.all([
        db.tracks.clear(),
        db.playlists.clear(),
        db.history.clear(),
        db.plays.clear(),
        db.preferences.clear(),
      ]);
      await refreshStats();
      showToast('All local data deleted');
      usePlayerStore.getState().clearQueue();
      setShowClearConfirm(false);
    } catch {
      showToast('Failed to clear database');
    }
  };

  const crossfadeOptions = [
    { label: 'Off', val: 0 },
    { label: '2s', val: 2 },
    { label: '3s', val: 3 },
    { label: '5s', val: 5 },
    { label: '8s', val: 8 },
    { label: '12s', val: 12 },
  ];

  return (
    <Modal isOpen={settingsOpen} onClose={closeSettings} title="Settings" className="max-w-xl">
      <div className="flex flex-col gap-8">
        {/* Playback */}
        <SettingsSection
          id="settings-playback"
          title="Playback"
          description="How songs are played and blended."
        >
          <div role="radiogroup" aria-labelledby="engine-label" className="py-3">
            <p id="engine-label" className="text-sm font-medium text-zinc-100">Playback Engine</p>
            <p className="text-[13px] text-zinc-400 mt-0.5 mb-3">Choose how audio is loaded.</p>
            <div className="flex flex-col gap-2">
              <EngineOption
                checked={playbackMode === 'iframe'}
                onSelect={() => handleModeChange('iframe')}
                title="YouTube Player"
                badge="Standard"
                description="Reliable. Supports the video view."
              />
              <EngineOption
                checked={playbackMode === 'direct-audio'}
                onSelect={() => handleModeChange('direct-audio')}
                title="Direct Audio"
                badge="Experimental"
                description="Streams audio only. The video view is unavailable."
              />
            </div>
            {playbackMode === 'direct-audio' && (
              <p className="flex items-start gap-2 mt-3 text-[13px] text-amber-200">
                <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-300" aria-hidden="true" />
                <span>Stream links refresh automatically. The YouTube player is used if a stream fails.</span>
              </p>
            )}
          </div>

          <div role="radiogroup" aria-labelledby="crossfade-label" className="py-3">
            <p id="crossfade-label" className="text-sm font-medium text-zinc-100">Crossfade</p>
            <p className="text-[13px] text-zinc-400 mt-0.5 mb-3">
              Fade between songs.{' '}
              <span className="text-zinc-200">{crossfadeDuration > 0 ? `${crossfadeDuration}s fade` : 'Off'}</span>
            </p>
            <div className="flex flex-wrap gap-1 p-1 rounded-[10px] bg-[#1d1d23] w-fit max-w-full">
              {crossfadeOptions.map(({ label, val }) => (
                <label key={val} className="relative cursor-pointer">
                  <input
                    type="radio"
                    name="crossfade"
                    value={val}
                    checked={crossfadeDuration === val}
                    onChange={() => {
                      setCrossfadeDuration(val);
                      showToast(val > 0 ? `Crossfade set to ${val}s` : 'Crossfade off');
                    }}
                    className="peer sr-only"
                  />
                  <span
                    className={cn(
                      'flex items-center justify-center min-w-[48px] min-h-[36px] px-3 rounded-lg text-sm font-medium transition-colors',
                      'peer-focus-visible:outline-2 peer-focus-visible:outline-white peer-focus-visible:outline-offset-1',
                      crossfadeDuration === val
                        ? 'bg-[#f4f4f6] text-[#0b0b0e] font-semibold'
                        : 'text-zinc-300 hover:text-white hover:bg-white/[0.08]'
                    )}
                  >
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </SettingsSection>

        {/* Appearance */}
        <SettingsSection id="settings-appearance" title="Appearance" description="Visual effects in the player.">
          <SwitchRow
            label="Artwork Glow"
            description="Tint the player background with colors from the current cover."
            checked={blurredHeroBackground}
            onChange={toggleBlurredHeroBackground}
          />
          <SwitchRow
            label="Waveform Visualizer"
            description="Show an animated waveform in Focus Mode while playing."
            checked={ambientVisualizerEnabled}
            onChange={toggleAmbientVisualizer}
          />
        </SettingsSection>

        {/* Session */}
        <SettingsSection id="settings-session" title="Session" description="What happens when the app opens.">
          <SwitchRow
            label="Restore Last Session"
            description="Bring back the queue, current song, and position on launch."
            checked={sessionRestoreEnabled}
            onChange={toggleSessionRestore}
          />
        </SettingsSection>

        {/* Data */}
        <SettingsSection
          id="settings-data"
          title="Data"
          description="Everything is stored in this browser. Export a backup to keep a copy or move to another device."
        >
          <dl className="grid grid-cols-3 gap-2 py-3">
            {[
              { label: 'Saved Songs', value: trackCount },
              { label: 'Playlists', value: playlistCount },
              { label: 'Plays Logged', value: historyCount },
            ].map((stat) => (
              <div key={stat.label} className="rounded-[10px] bg-[#1d1d23] px-3 py-2.5">
                <dd className="text-lg font-semibold text-white tabular-nums">{stat.value}</dd>
                <dt className="text-[13px] text-zinc-400">{stat.label}</dt>
              </div>
            ))}
          </dl>
          <p className="text-[13px] text-zinc-400 pb-3">
            Storage used: <span className="text-zinc-100 font-mono">{storageMB} MB</span>
          </p>

          <div className="flex flex-wrap items-center gap-2 pb-3">
            <button type="button" onClick={handleExportBackup} disabled={isExporting} className={primaryBtn}>
              {isExporting ? (
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              ) : (
                <FileDown size={16} aria-hidden="true" />
              )}
              <span>Export Library</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileSelect}
              className="hidden"
              aria-label="Backup file"
              tabIndex={-1}
            />

            <button type="button" onClick={() => fileInputRef.current?.click()} className={ghostBtn}>
              <Upload size={16} aria-hidden="true" />
              <span>Restore from File</span>
            </button>

            {/* Transfer Library button (added by library transfer feature) */}
          </div>

          {fileValidation && fileValidation.isValid && (
            <div className="rounded-[10px] bg-[#1d1d23] p-4 space-y-3 mb-3" role="region" aria-label="Restore backup">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-zinc-100">
                  <Check size={14} className="text-emerald-400" aria-hidden="true" />
                  <span>Backup Ready to Restore</span>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFileValidation(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className={quietBtn}
                >
                  Cancel
                </button>
              </div>

              <dl className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Playlists', value: fileValidation.summary?.playlistCount },
                  { label: 'Songs', value: fileValidation.summary?.trackCount },
                  { label: 'History', value: fileValidation.summary?.historyCount },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-lg bg-[#141418] px-2 py-2">
                    <dd className="font-mono font-semibold text-white">{stat.value}</dd>
                    <dt className="text-xs text-zinc-400">{stat.label}</dt>
                  </div>
                ))}
              </dl>

              <div role="radiogroup" aria-labelledby="restore-mode-label">
                <p id="restore-mode-label" className="text-[13px] font-medium text-zinc-300 mb-1.5">Restore Mode</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { mode: 'merge' as const, icon: Layers, title: 'Merge', text: 'Keep existing playlists' },
                    { mode: 'replace' as const, icon: RefreshCw, title: 'Replace', text: 'Erase current data first' },
                  ].map(({ mode, icon: Icon, title, text }) => (
                    <label key={mode} className="relative cursor-pointer">
                      <input
                        type="radio"
                        name="restoreMode"
                        checked={restoreMode === mode}
                        onChange={() => setRestoreMode(mode)}
                        className="peer sr-only"
                      />
                      <span
                        className={cn(
                          'block p-3 rounded-lg border text-left transition-colors min-h-[56px]',
                          'peer-focus-visible:outline-2 peer-focus-visible:outline-white peer-focus-visible:outline-offset-1',
                          restoreMode === mode
                            ? mode === 'replace'
                              ? 'border-rose-400/60 bg-rose-500/10'
                              : 'border-white/40 bg-white/[0.08]'
                            : 'border-white/[0.08] hover:border-white/[0.16]'
                        )}
                      >
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-zinc-100">
                          <Icon size={14} aria-hidden="true" />
                          {title}
                        </span>
                        <span className="block text-[13px] text-zinc-400 mt-0.5">{text}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleExecuteRestore}
                disabled={isRestoring}
                className={cn(primaryBtn, 'w-full')}
              >
                {isRestoring ? (
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Check size={16} aria-hidden="true" />
                )}
                <span>Restore Library</span>
              </button>
            </div>
          )}

          {restoreError && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-[10px] bg-rose-500/10 border border-rose-500/30 p-3 text-sm text-rose-200 mb-3"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-300" aria-hidden="true" />
              <span>{restoreError}</span>
            </p>
          )}

          <div className="flex items-center justify-between gap-4 py-3 border-t border-white/[0.06]">
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-100">Reset Library Data</p>
              <p className="text-[13px] text-zinc-400 mt-0.5">
                Delete playlists, history, stats, and saved songs from this browser.
              </p>
            </div>
            <button type="button" onClick={() => setShowClearConfirm(true)} className={cn(dangerBtn, 'shrink-0')}>
              <Trash2 size={16} aria-hidden="true" />
              <span>Reset</span>
            </button>
          </div>
        </SettingsSection>
      </div>

      <ConfirmModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearDatabase}
        title="Reset Library Data?"
        description="This permanently deletes all playlists, listening history, stats, and saved songs from this browser. It cannot be undone."
        confirmText="Delete All Data"
        isDestructive={true}
      />
    </Modal>
  );
}

function SettingsSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id}>
      <h3 id={id} className="text-base font-semibold text-white">
        {title}
      </h3>
      {description && <p className="text-[13px] text-zinc-400 mt-0.5">{description}</p>}
      <div className="mt-2 border-t border-white/[0.08] divide-y divide-white/[0.06]">{children}</div>
    </section>
  );
}

function EngineOption({
  checked,
  onSelect,
  title,
  badge,
  description,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  badge: string;
  description: string;
}) {
  return (
    <label className="relative block cursor-pointer">
      <input type="radio" name="playbackMode" checked={checked} onChange={onSelect} className="peer sr-only" />
      <span
        className={cn(
          'flex items-start gap-3 p-3 min-h-[56px] rounded-lg border transition-colors',
          'peer-focus-visible:outline-2 peer-focus-visible:outline-white peer-focus-visible:outline-offset-1',
          checked ? 'border-white/40 bg-white/[0.06]' : 'border-white/[0.08] hover:border-white/[0.16]'
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center',
            checked ? 'border-white' : 'border-zinc-500'
          )}
        >
          {checked && <span className="w-2 h-2 rounded-full bg-white" />}
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-100">{title}</span>
            <span className="text-xs px-1.5 py-0.5 rounded-md bg-white/[0.08] text-zinc-300">{badge}</span>
          </span>
          <span className="block text-[13px] text-zinc-400 mt-0.5">{description}</span>
        </span>
      </span>
    </label>
  );
}
