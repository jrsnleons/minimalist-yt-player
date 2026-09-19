'use client';

import { Settings, Disc3, Maximize2, PanelRight, Radio } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useListenTogetherStore } from '@/store/useListenTogetherStore';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils';

export type MainNavTab = 'home' | 'search' | 'library';

interface TopNavProps {
  activeTab: MainNavTab;
  onTabChange: (tab: MainNavTab) => void;
}

export function TopNav({ activeTab, onTabChange }: TopNavProps) {
  const toggleSettings = usePlayerStore((s) => s.toggleSettings);
  const toggleZenMode = usePlayerStore((s) => s.toggleZenMode);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const sidebarPlayerMode = usePlayerStore((s) => s.sidebarPlayerMode);
  const toggleSidebarPlayerMode = usePlayerStore((s) => s.toggleSidebarPlayerMode);

  const isInRoom = useListenTogetherStore((s) => s.isInRoom);
  const roomCode = useListenTogetherStore((s) => s.roomCode);
  const openListenModal = useListenTogetherStore((s) => s.openModal);

  const navTabs: { key: MainNavTab; label: string }[] = [
    { key: 'home', label: 'Home' },
    { key: 'search', label: 'Search' },
    { key: 'library', label: 'Library' },
  ];

  return (
    <header
      className="flex items-center justify-between px-4 sm:px-6 h-14 border-b border-white/[0.08] apple-liquid-glass shrink-0 z-30 select-none"
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
          <span className="text-sm font-semibold tracking-tight text-white font-sans">
            Onyx
          </span>
          <span className="text-[11px] font-mono tracking-wide text-zinc-400 px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08]">
            Audio
          </span>
        </div>
      </div>

      {/* Center: 3 Navigation Pills (Text-only Apple HIG style) */}
      <nav className="flex items-center p-1 rounded-2xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-md" aria-label="Main navigation">
        <div className="flex items-center gap-0.5" role="tablist">
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                role="tab"
                id={`topnav-tab-${tab.key}`}
                aria-selected={isActive}
                onClick={() => onTabChange(tab.key)}
                className={cn(
                  'relative px-4 py-1.5 rounded-xl text-xs transition-all duration-200 cursor-pointer select-none min-h-[32px] font-sans tracking-tight',
                  isActive
                    ? 'text-white font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-topnav-pill"
                    className="absolute inset-0 bg-white/[0.12] border border-white/[0.12] rounded-xl shadow-sm z-0"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Right: Listen Together, Player Toggle, Zen Focus Mode & Settings */}
      <div className="flex items-center gap-2">
        <Tooltip content={isInRoom ? `Live Session (${roomCode})` : 'Listen Together'} side="bottom">
          <button
            onClick={() => openListenModal()}
            aria-label="Open Listen Together dialog"
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer min-h-[36px]',
              isInRoom
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.15)]'
                : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/[0.16] text-zinc-400 hover:text-white'
            )}
          >
            <Radio size={13} className={isInRoom ? 'animate-pulse text-emerald-400' : ''} />
            <span className="hidden sm:inline">
              {isInRoom ? `Live · ${roomCode}` : 'Listen Together'}
            </span>
          </button>
        </Tooltip>

        <Tooltip
          content={sidebarPlayerMode === 'docked' ? 'Minimize Player (Q)' : 'Show Player & Queue (Q)'}
          side="bottom"
        >
          <button
            onClick={toggleSidebarPlayerMode}
            aria-label="Toggle player and queue sidebar (Q)"
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer min-h-[36px]',
              sidebarPlayerMode === 'docked'
                ? 'border-white/20 bg-white/[0.09] text-white shadow-sm'
                : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/[0.16] text-zinc-400 hover:text-white'
            )}
          >
            <PanelRight size={13} />
            <span className="hidden sm:inline">Player</span>
          </button>
        </Tooltip>

        <Tooltip content="Focus Mode (Z)" side="bottom">
          <button
            onClick={() => toggleZenMode(true)}
            aria-label="Enter Focus Mode (Z)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/[0.16] text-zinc-400 hover:text-white text-xs font-medium transition-all cursor-pointer min-h-[36px]"
          >
            <Maximize2 size={13} />
            <span className="hidden sm:inline">Focus</span>
          </button>
        </Tooltip>

        <Tooltip content="Settings" side="bottom">
          <button
            onClick={toggleSettings}
            aria-label="Open settings"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/[0.16] text-zinc-400 hover:text-white text-xs font-medium transition-all cursor-pointer min-h-[36px]"
          >
            <Settings size={13} />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </Tooltip>
      </div>
    </header>
  );
}
