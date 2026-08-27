'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Track } from '@/types';
import { getTrackPalette } from '@/components/ui/TrackArtwork';
import {
  extractPaletteFromImageUrl,
  getCachedPalette,
  type DynamicPalette,
} from '@/lib/paletteExtractor';

export function useDynamicTrackPalette(track?: Partial<Track> | null): DynamicPalette {
  const fallbackPalette = useMemo<DynamicPalette>(() => {
    if (!track) {
      return {
        primary: '#a855f7',
        accent: '#c084fc',
        secondary: '#e9d5ff',
        bgFrom: '#181224',
        bgTo: '#070709',
        glow: 'rgba(168, 85, 247, 0.4)',
        textColor: '#ffffff',
        isExtracted: false,
      };
    }
    const staticPal = getTrackPalette(track.title || '', track.artist || '', track.id || '');
    return {
      primary: staticPal.accent,
      accent: staticPal.accent,
      secondary: staticPal.secondary,
      bgFrom: staticPal.bgFrom,
      bgTo: staticPal.bgTo,
      glow: staticPal.glow,
      textColor: '#ffffff',
      isExtracted: false,
    };
  }, [track?.title, track?.artist, track?.id]);

  const [extractedPalette, setExtractedPalette] = useState<DynamicPalette | null>(() => {
    return getCachedPalette(track?.thumbnailUrl);
  });

  useEffect(() => {
    if (!track?.thumbnailUrl) {
      setExtractedPalette(null);
      return;
    }

    // Check if already in cache
    const cached = getCachedPalette(track.thumbnailUrl);
    if (cached) {
      setExtractedPalette(cached);
      return;
    }

    let isMounted = true;
    extractPaletteFromImageUrl(track.thumbnailUrl).then((palette) => {
      if (isMounted && palette) {
        setExtractedPalette(palette);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [track?.thumbnailUrl, track?.id]);

  return extractedPalette || fallbackPalette;
}
