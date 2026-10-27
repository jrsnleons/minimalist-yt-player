'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useListenTogetherStore } from '@/store/useListenTogetherStore';

export function FloatingReactions() {
  const reactions = useListenTogetherStore((s) => s.reactions);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[100] overflow-hidden select-none"
      aria-hidden="true"
    >
      <AnimatePresence>
        {reactions.slice(0, 10).map((r, idx) => {
          // Deterministic horizontal spread based on timestamp/id
          const randomOffset = ((parseInt(r.id.slice(-4), 16) || idx * 37) % 60) - 30;

          return (
            <motion.div
              key={r.id}
              initial={{
                opacity: 0,
                scale: 0.5,
                y: 0,
                x: `calc(-50% + ${randomOffset}vw)`,
              }}
              animate={{
                opacity: [0, 1, 1, 0],
                scale: [0.5, 1.25, 1.1, 0.8],
                y: -320,
                x: `calc(-50% + ${randomOffset}vw)`,
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 2.4,
                ease: [0.2, 0, 0.1, 1],
              }}
              className="absolute bottom-24 left-1/2 flex flex-col items-center gap-1"
            >
              <span className="text-3xl filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                {r.emoji}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-xs font-mono text-zinc-300 border border-white/10 shadow-sm whitespace-nowrap">
                {r.userName}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
