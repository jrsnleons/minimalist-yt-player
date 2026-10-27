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
        <p className="text-sm text-zinc-400">Keys for playback, views, and navigation.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
          {groups.map((group) => (
            <section key={group.category} aria-label={group.category}>
              <h3 className="text-[13px] font-semibold text-zinc-300 pb-2 mb-1 border-b border-white/[0.08]">
                {group.category}
              </h3>

              <ul>
                {group.items.map((item, idx) => (
                  <li
                    key={`${group.category}-${idx}`}
                    className="flex items-center justify-between gap-3 text-sm min-h-[36px]"
                  >
                    <span className="text-zinc-200 truncate">{item.label}</span>

                    <span className="flex items-center gap-1 shrink-0">
                      {item.key.map((k, kIdx) => (
                        <span key={kIdx} className="flex items-center gap-1">
                          <kbd className="px-1.5 py-0.5 text-xs font-mono rounded-md bg-[#1d1d23] border border-white/[0.14] text-zinc-100">
                            {k}
                          </kbd>
                          {kIdx < item.key.length - 1 && (
                            <span className="text-xs text-zinc-400 font-mono" aria-hidden="true">/</span>
                          )}
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </Modal>
  );
}
