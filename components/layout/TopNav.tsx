'use client';

import { Search, Settings, Disc3, Maximize2 } from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { Tooltip } from '@/components/ui/Tooltip';
import { usePlatformShortcut } from '@/hooks/usePlatformShortcut';

export function TopNav() {
  const toggleCommandPalette = usePlayerStore((s) => s.toggleCommandPalette);
  const toggleSettings = usePlayerStore((s) => s.toggleSettings);
  const toggleZenMode = usePlayerStore((s) => s.toggleZenMode);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const shortcutKey = usePlatformShortcut('⌘K');

  return (
    <header
      className="flex items-center justify-between px-6 h-14 border-b border-white/[0.06] bg-[#07070a]/90 backdrop-blur-xl shrink-0 z-30 select-none"
      aria-label="Top navigation"
    >
      {/* Left: App Branding */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-zinc-800 to-black border border-white/20 text-white flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
          <Disc3
            size={16}
            className={isPlaying ? 'animate-spin text-white' : 'text-zinc-300'}
            style={{ animationDuration: '3s' }}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-extrabold tracking-wider text-white uppercase font-sans">
            Onyx
          </span>
          <span className="text-[9px] font-mono tracking-widest text-zinc-400 px-1.5 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] uppercase">
            Audio
          </span>
        </div>
      </div>

      {/* Center: Command Palette Trigger Button */}
      <div className="flex-1 max-w-md mx-6">
        <button
          onClick={toggleCommandPalette}
          aria-label="Search tracks, library, actions (⌘K / Ctrl+K)"
          className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/[0.16] text-zinc-400 hover:text-zinc-200 transition-all group cursor-pointer shadow-sm"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Search size={13} className="text-zinc-500 group-hover:text-zinc-300 transition-colors shrink-0" />
            <span className="text-xs truncate text-zinc-400 group-hover:text-zinc-300">Search songs, paste links, or type actions...</span>
          </div>
          <kbd
            suppressHydrationWarning
            className="px-1.5 py-0.5 text-[10px] rounded-md bg-white/[0.06] border border-white/[0.1] text-zinc-300 font-mono shrink-0"
          >
            {shortcutKey}
          </kbd>
        </button>
      </div>

      {/* Right: Zen Focus Mode & Settings */}
      <div className="flex items-center gap-2">
        <Tooltip content="Zen Focus Mode (Z)" side="bottom">
          <button
            onClick={() => toggleZenMode(true)}
            aria-label="Enter Zen Focus Mode (Z)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/[0.16] text-zinc-400 hover:text-white text-xs font-medium transition-all cursor-pointer"
          >
            <Maximize2 size={13} />
            <span className="hidden sm:inline">Focus</span>
          </button>
        </Tooltip>

        <Tooltip content="Settings & Library Vault" side="bottom">
          <button
            onClick={toggleSettings}
            aria-label="Open settings"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/[0.16] text-zinc-400 hover:text-white text-xs font-medium transition-all cursor-pointer"
          >
            <Settings size={13} />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </Tooltip>
      </div>
    </header>
  );
}
