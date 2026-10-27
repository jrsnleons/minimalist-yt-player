'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useListenTogetherStore } from '@/store/useListenTogetherStore';

export function FloatingReactions() {
  const reactions = useListenTogetherStore((s) => s.reactions);
  const reduceMotion = useReducedMotion();

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden select-none" aria-hidden="true">
      <AnimatePresence>
        {reactions.slice(0, 10).map((r, idx) => {
          // Deterministic horizontal spread based on the reaction id
          const offset = ((parseInt(r.id.slice(-4), 16) || idx * 37) % 60) - 30;

          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 0, x: `calc(-50% + ${offset}vw)` }}
              animate={
                reduceMotion
                  ? { opacity: [0, 1, 1, 0], y: -40, x: `calc(-50% + ${offset}vw)` }
                  : { opacity: [0, 1, 1, 0], y: -320, x: `calc(-50% + ${offset}vw)` }
              }
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 1.6 : 2.4, ease: [0.2, 0, 0.1, 1] }}
              className="absolute bottom-24 left-1/2 flex flex-col items-center gap-1"
            >
              <span className="text-3xl leading-none">{r.emoji}</span>
              <span className="px-2 py-0.5 rounded-full bg-black/70 text-xs text-zinc-300 whitespace-nowrap">
                {r.userName}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
