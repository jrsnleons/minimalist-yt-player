'use client';

import { Modal } from '@/components/ui/Modal';
import { usePlayerStore } from '@/store/usePlayerStore';
import { usePlatformShortcut } from '@/hooks/usePlatformShortcut';
import { SHORTCUTS, SHORTCUT_GROUPS } from '@/lib/shortcuts';

export function KeyboardShortcutsModal() {
  const shortcutsModalOpen = usePlayerStore((s) => s.shortcutsModalOpen);
  const closeShortcutsModal = usePlayerStore((s) => s.closeShortcutsModal);
  const omniboxKey = usePlatformShortcut('⌘K');

  const groups = SHORTCUT_GROUPS.map((category) => ({
    category,
    items: SHORTCUTS.filter((s) => s.group === category).map((s) => ({
      key: s.id === 'palette' ? [omniboxKey] : s.display,
      label: s.label,
    })),
  }));

  return (
    <Modal
      isOpen={shortcutsModalOpen}
      onClose={closeShortcutsModal}
      title="Keyboard Shortcuts"
      className="max-w-xl"
    >
      <div className="space-y-5">
        <p className="text-sm text-zinc-400 leading-relaxed">
          Keys for playback, views, and navigation.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {groups.map((group) => (
            <div
              key={group.category}
              className="p-3.5 rounded-2xl border border-white/[0.07] bg-[#0c0c10] space-y-2.5 shadow-inner"
            >
              <h3 className="text-sm font-semibold text-zinc-200 tracking-tight font-sans">
                {group.category}
              </h3>

              <div className="space-y-2">
                {group.items.map((item, idx) => (
                  <div
                    key={`${group.category}-${idx}`}
                    className="flex items-center justify-between text-sm py-0.5"
                  >
                    <span className="text-zinc-400 text-sm truncate mr-2">
                      {item.label}
                    </span>

                    <div className="flex items-center gap-1 shrink-0">
                      {item.key.map((k, kIdx) => (
                        <span key={kIdx} className="flex items-center gap-1">
                          <kbd className="px-1.5 py-0.5 text-xs font-mono font-medium rounded-md bg-white/[0.06] border border-white/[0.1] text-zinc-200 shadow-sm">
                            {k}
                          </kbd>
                          {kIdx < item.key.length - 1 && (
                            <span className="text-xs text-zinc-500 font-mono">/</span>
                          )}
                        </span>
                      ))}
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
