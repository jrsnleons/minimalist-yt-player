'use client';

import { Modal } from '@/components/ui/Modal';
import { usePlayerStore } from '@/store/usePlayerStore';
import { usePlatformShortcut } from '@/hooks/usePlatformShortcut';

interface ShortcutGroup {
  category: string;
  items: { key: string | string[]; label: string }[];
}

export function KeyboardShortcutsModal() {
  const shortcutsModalOpen = usePlayerStore((s) => s.shortcutsModalOpen);
  const closeShortcutsModal = usePlayerStore((s) => s.closeShortcutsModal);
  const omniboxKey = usePlatformShortcut('⌘K');

  const groups: ShortcutGroup[] = [
    {
      category: 'Playback',
      items: [
        { key: ['Space', 'K'], label: 'Play / Pause' },
        { key: ['J', 'L'], label: 'Seek backward / forward 10s' },
        { key: ['←', '→'], label: 'Seek backward / forward 5s' },
        { key: 'N', label: 'Next track' },
        { key: 'P', label: 'Previous track' },
        { key: 'S', label: 'Toggle shuffle' },
        { key: 'R', label: 'Cycle repeat mode' },
        { key: 'M', label: 'Mute / unmute audio' },
      ],
    },
    {
      category: 'Display & Navigation',
      items: [
        { key: omniboxKey, label: 'Search & Command Palette' },
        { key: 'V', label: 'Toggle Video / Artwork' },
        { key: ['Z', 'F'], label: 'Focus Mode (Zen Player)' },
        { key: 'Q', label: 'Toggle Sidebar / Floating Pill' },
        { key: '?', label: 'Keyboard Shortcuts' },
        { key: 'ESC', label: 'Close overlay or exit Focus Mode' },
      ],
    },
  ];

  return (
    <Modal
      isOpen={shortcutsModalOpen}
      onClose={closeShortcutsModal}
      title="Keyboard Shortcuts"
      className="max-w-xl"
    >
      <div className="space-y-5">
        <p className="text-xs text-zinc-400 leading-relaxed">
          Quick keyboard shortcuts to control playback, views, and navigation.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {groups.map((group) => (
            <div
              key={group.category}
              className="p-3.5 rounded-2xl border border-white/[0.07] bg-[#0c0c10] space-y-2.5 shadow-inner"
            >
              <h3 className="text-xs font-semibold text-zinc-200 tracking-tight font-sans">
                {group.category}
              </h3>

              <div className="space-y-2">
                {group.items.map((item, idx) => (
                  <div
                    key={`${group.category}-${idx}`}
                    className="flex items-center justify-between text-xs py-0.5"
                  >
                    <span className="text-zinc-400 text-xs truncate mr-2">
                      {item.label}
                    </span>

                    <div className="flex items-center gap-1 shrink-0">
                      {Array.isArray(item.key) ? (
                        item.key.map((k, kIdx) => (
                          <span key={kIdx} className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 text-[11px] font-mono font-medium rounded-md bg-white/[0.06] border border-white/[0.1] text-zinc-200 shadow-sm">
                              {k}
                            </kbd>
                            {kIdx < (item.key as string[]).length - 1 && (
                              <span className="text-[11px] text-zinc-600 font-mono">/</span>
                            )}
                          </span>
                        ))
                      ) : (
                        <kbd className="px-1.5 py-0.5 text-[11px] font-mono font-medium rounded-md bg-white/[0.06] border border-white/[0.1] text-zinc-200 shadow-sm">
                          {item.key}
                        </kbd>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
