'use client';

import { Home, Search, Library, Settings, Radio, Smartphone } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useListenTogetherStore } from '@/store/useListenTogetherStore';
import { useRemoteHostStore } from '@/store/useRemoteHostStore';
import { usePlatformShortcut } from '@/hooks/usePlatformShortcut';
import { PlaylistCover } from '@/components/ui/PlaylistCover';
import { cn } from '@/lib/utils';
import type { Playlist } from '@/types';

export type MainNavTab = 'home' | 'search' | 'library';

export const NAV_ITEMS: { key: MainNavTab; label: string; icon: typeof Home }[] = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'search', label: 'Search', icon: Search },
  { key: 'library', label: 'Library', icon: Library },
];

interface AppSidebarProps {
  activeTab: MainNavTab;
  onTabChange: (tab: MainNavTab) => void;
  onSelectPlaylist: (playlist: Playlist) => void;
}

export function AppSidebar({ activeTab, onTabChange, onSelectPlaylist }: AppSidebarProps) {
  const toggleSettings = usePlayerStore((s) => s.toggleSettings);
  const toggleCommandPalette = usePlayerStore((s) => s.toggleCommandPalette);
  const isInRoom = useListenTogetherStore((s) => s.isInRoom);
  const roomCode = useListenTogetherStore((s) => s.roomCode);
  const openListenModal = useListenTogetherStore((s) => s.openModal);
  const phones = useRemoteHostStore((s) => s.phones);
  const hasRemote = useRemoteHostStore((s) => s.session !== null);
  const openRemoteModal = useRemoteHostStore((s) => s.openModal);
  const shortcutKey = usePlatformShortcut('⌘K');

  const playlists = useLiveQuery(
    () => db.playlists.filter((p) => p.id !== 'liked-songs').reverse().sortBy('updatedAt'),
    []
  );

  const itemClass =
    'flex items-center gap-3 w-full px-2.5 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer min-h-[38px] text-left select-none';

  return (
    <aside
      className="hidden md:flex w-[236px] shrink-0 flex-col gap-5 px-3 py-5 border-r border-white/[0.08] min-h-0"
      aria-label="Library sidebar"
    >
      <p className="px-2.5 text-lg font-bold tracking-tight text-white">Onyx</p>

      <button
        onClick={toggleCommandPalette}
        className="flex items-center gap-2.5 w-full px-2.5 py-2 min-h-[38px] rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-zinc-400 hover:text-white hover:bg-white/[0.07] transition-colors cursor-pointer text-left select-none"
      >
        <Search size={16} aria-hidden="true" />
        <span>Search</span>
        <kbd className="ml-auto font-mono text-xs text-zinc-400">{shortcutKey}</kbd>
      </button>

      <nav aria-label="Main">
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
            const active = activeTab === key;
            return (
              <li key={key}>
                <button
                  onClick={() => onTabChange(key)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(itemClass, active && 'bg-white/[0.09] text-white')}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <section className="flex flex-col min-h-0 flex-1" aria-labelledby="sidebar-playlists">
        <h2 id="sidebar-playlists" className="px-2.5 pb-2 text-xs font-semibold text-zinc-400">
          Playlists
        </h2>
        {playlists && playlists.length > 0 ? (
          <ul className="flex flex-col gap-0.5 overflow-y-auto min-h-0">
            {playlists.map((pl) => (
              <li key={pl.id}>
                <button
                  onClick={() => onSelectPlaylist(pl)}
                  className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-left hover:bg-white/[0.05] transition-colors cursor-pointer"
                >
                  <PlaylistCover playlist={pl} className="w-9 h-9 rounded shrink-0" />
                  <span className="min-w-0 flex flex-col">
                    <span className="truncate text-sm font-medium text-zinc-200">{pl.name}</span>
                    <span className="text-xs text-zinc-400">
                      {pl.trackIds.length} {pl.trackIds.length === 1 ? 'song' : 'songs'}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-2.5 text-sm text-zinc-400">No playlists yet</p>
        )}
      </section>

      <div className="flex flex-col gap-0.5 pt-3 border-t border-white/[0.08]">
        <button onClick={() => openListenModal()} className={itemClass}>
          <Radio size={18} aria-hidden="true" className={isInRoom ? 'text-emerald-400' : undefined} />
          <span>{isInRoom ? `Live · ${roomCode}` : 'Listen Together'}</span>
        </button>
        <button onClick={openRemoteModal} className={itemClass}>
          <Smartphone size={18} aria-hidden="true" className={phones > 0 ? 'text-emerald-400' : undefined} />
          <span>{phones > 0 ? 'Phone Connected' : hasRemote ? 'Phone Remote' : 'Connect Phone'}</span>
        </button>
        <button onClick={toggleSettings} className={itemClass}>
          <Settings size={18} aria-hidden="true" />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}
