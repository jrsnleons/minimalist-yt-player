'use client';

import { PanelLeft, PanelRight, Search, Settings, Disc3 } from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils';

export function TopNav() {
  const {
    toggleLeftSidebar,
    toggleRightSidebar,
    toggleCommandPalette,
    toggleSettings,
    leftSidebarOpen,
    rightSidebarOpen,
    isPlaying,
  } = usePlayerStore();

  return (
    <header
      className="flex items-center justify-between px-4 h-13 border-b border-[#27272a] bg-[#0f0f13] shrink-0 z-30 select-none"
      aria-label="Top navigation"
    >
      {/* Left: App Logo + Sidebar Toggle */}
      <div className="flex items-center gap-3 w-64">
        <Tooltip content="Toggle library ([)" side="bottom">
          <button
            onClick={toggleLeftSidebar}
            aria-label={leftSidebarOpen ? 'Close library sidebar' : 'Open library sidebar'}
            aria-pressed={leftSidebarOpen}
            className={cn(
              'p-2 rounded-md transition-colors',
              leftSidebarOpen
                ? 'text-zinc-200 bg-[#1e1e24] hover:bg-[#27272f]'
                : 'text-zinc-400 hover:text-white hover:bg-[#1e1e24]'
            )}
          >
            <PanelLeft size={16} />
          </button>
        </Tooltip>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-white text-black flex items-center justify-center font-bold text-xs shadow-sm">
            <Disc3 size={15} className={isPlaying ? 'animate-spin' : ''} style={{ animationDuration: '4s' }} />
          </div>
          <span className="text-sm font-semibold tracking-tight text-white">
            yt<span className="text-zinc-400 font-normal">music</span>
          </span>
        </div>
      </div>

      {/* Center: Command Palette Trigger Button */}
      <div className="flex-1 max-w-lg flex justify-center">
        <button
          onClick={toggleCommandPalette}
          aria-label="Search tracks, library, actions (Cmd+K)"
          className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-lg border border-[#27272a] bg-[#16161b] hover:bg-[#1c1c22] hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all duration-150 shadow-inner group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Search size={14} className="text-zinc-500 group-hover:text-zinc-300 transition-colors shrink-0" />
            <span className="text-xs truncate">Search songs, artists, playlists, commands...</span>
          </div>
          <kbd className="ml-2 px-1.5 py-0.5 text-[10px] rounded bg-[#27272a] border border-zinc-700 text-zinc-300 font-mono-time shrink-0 group-hover:border-zinc-500">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Settings & Queue Sidebar Toggle */}
      <div className="flex items-center justify-end gap-1.5 w-64">
        <Tooltip content="Settings & Engine" side="bottom">
          <button
            onClick={toggleSettings}
            aria-label="Open settings"
            className="p-2 rounded-md text-zinc-400 hover:text-white hover:bg-[#1e1e24] transition-colors"
          >
            <Settings size={16} />
          </button>
        </Tooltip>

        <Tooltip content="Toggle queue (])" side="bottom">
          <button
            onClick={toggleRightSidebar}
            aria-label={rightSidebarOpen ? 'Close queue sidebar' : 'Open queue sidebar'}
            aria-pressed={rightSidebarOpen}
            className={cn(
              'p-2 rounded-md transition-colors',
              rightSidebarOpen
                ? 'text-zinc-200 bg-[#1e1e24] hover:bg-[#27272f]'
                : 'text-zinc-400 hover:text-white hover:bg-[#1e1e24]'
            )}
          >
            <PanelRight size={16} />
          </button>
        </Tooltip>
      </div>
    </header>
  );
}
