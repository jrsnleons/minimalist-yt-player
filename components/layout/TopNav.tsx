'use client';

import { Search, Settings, Disc3, Sparkles } from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { Tooltip } from '@/components/ui/Tooltip';

export function TopNav() {
  const {
    toggleCommandPalette,
    toggleSettings,
    isPlaying,
  } = usePlayerStore();

  return (
    <header
      className="flex items-center justify-between px-6 h-14 border-b border-[#27272a] bg-[#0c0c10] shrink-0 z-30 select-none"
      aria-label="Top navigation"
    >
      {/* Left: App Branding */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-white text-black flex items-center justify-center font-bold text-xs shadow-md">
          <Disc3 size={17} className={isPlaying ? 'animate-spin' : ''} style={{ animationDuration: '3s' }} />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-tight text-white leading-none">
            yt<span className="text-zinc-400 font-normal">music</span>
          </span>
          <span className="text-[9px] font-mono-time text-zinc-500 tracking-wider uppercase mt-0.5">Minimalist</span>
        </div>
      </div>

      {/* Center: Command Palette Trigger Button */}
      <div className="flex-1 max-w-md mx-6">
        <button
          onClick={toggleCommandPalette}
          aria-label="Search tracks, library, actions (Cmd+K)"
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl border border-[#27272a] bg-[#141419] hover:bg-[#1c1c24] hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all shadow-inner group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Search size={14} className="text-zinc-500 group-hover:text-zinc-300 transition-colors shrink-0" />
            <span className="text-xs truncate">Search songs, artists, actions...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-[#22222a] border border-zinc-700 text-zinc-300 font-mono-time shrink-0">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Settings */}
      <div className="flex items-center gap-2">
        <Tooltip content="Settings & Playback Engine" side="bottom">
          <button
            onClick={toggleSettings}
            aria-label="Open settings"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#27272f] bg-[#141419] hover:bg-[#1e1e26] text-zinc-400 hover:text-white text-xs font-medium transition-colors"
          >
            <Settings size={14} />
            <span>Settings</span>
          </button>
        </Tooltip>
      </div>
    </header>
  );
}
