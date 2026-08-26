'use client';

import { PanelLeft, PanelRight, Search, Settings } from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { Tooltip } from '@/components/ui/Tooltip';

export function TopNav() {
  const {
    toggleLeftSidebar,
    toggleRightSidebar,
    toggleCommandPalette,
    toggleSettings,
    leftSidebarOpen,
    rightSidebarOpen,
  } = usePlayerStore();

  return (
    <nav
      className="flex items-center justify-between px-4 h-12 border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-md shrink-0 z-30"
      aria-label="Top navigation"
    >
      {/* Left: App name + sidebar toggle */}
      <div className="flex items-center gap-3">
        <Tooltip content="Toggle library ([)" side="bottom">
          <button
            onClick={toggleLeftSidebar}
            aria-label={leftSidebarOpen ? 'Close library sidebar' : 'Open library sidebar'}
            aria-pressed={leftSidebarOpen}
            className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <PanelLeft size={16} />
          </button>
        </Tooltip>
        <span className="text-sm font-semibold tracking-tight text-white select-none">
          yt<span className="text-zinc-500 font-normal">player</span>
        </span>
      </div>

      {/* Center: Command palette trigger */}
      <button
        onClick={toggleCommandPalette}
        aria-label="Open command palette (Cmd+K)"
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-md border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 text-xs transition-colors w-72 justify-between"
      >
        <div className="flex items-center gap-2">
          <Search size={13} className="text-zinc-500" />
          <span>Search library, YouTube…</span>
        </div>
        <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-zinc-800 text-zinc-400 font-mono-time border border-zinc-700/50">
          ⌘K
        </kbd>
      </button>

      {/* Right: Settings & Queue sidebar toggle */}
      <div className="flex items-center gap-1.5">
        <Tooltip content="Settings & Engine" side="bottom">
          <button
            onClick={toggleSettings}
            aria-label="Open settings"
            className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <Settings size={16} />
          </button>
        </Tooltip>

        <Tooltip content="Toggle queue (])" side="bottom">
          <button
            onClick={toggleRightSidebar}
            aria-label={rightSidebarOpen ? 'Close queue sidebar' : 'Open queue sidebar'}
            aria-pressed={rightSidebarOpen}
            className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <PanelRight size={16} />
          </button>
        </Tooltip>
      </div>
    </nav>
  );
}
