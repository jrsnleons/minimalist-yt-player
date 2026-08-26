'use client';

import { useYouTubePlayer } from '@/hooks/useYouTubePlayer';
import { usePlayerStore } from '@/store/usePlayerStore';
import { PiPWindow } from '@/components/ui/PiPWindow';

export function YouTubeIframe() {
  const { containerRef } = useYouTubePlayer();
  const { isVideoEnabled, toggleVideo } = usePlayerStore();

  return (
    <PiPWindow isVisible={isVideoEnabled} onClose={toggleVideo}>
      <div
        id="yt-player-container"
        ref={containerRef}
        className="w-full h-full bg-black flex items-center justify-center overflow-hidden"
      />
    </PiPWindow>
  );
}
