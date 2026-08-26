'use client';

import { useState, useId } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { Track } from '@/types';

export interface TrackArtworkProps {
  track?: Partial<Track> | null;
  src?: string | null;
  title?: string;
  artist?: string;
  id?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'hero' | 'fill';
  className?: string;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  showInitials?: boolean;
}

interface Palette {
  bgFrom: string;
  bgTo: string;
  accent: string;
  secondary: string;
  glow: string;
}

const NOIR_PALETTES: Palette[] = [
  { bgFrom: '#181828', bgTo: '#0b0b12', accent: '#6366f1', secondary: '#818cf8', glow: 'rgba(99,102,241,0.25)' },
  { bgFrom: '#24141a', bgTo: '#0e080b', accent: '#f43f5e', secondary: '#fb7185', glow: 'rgba(244,63,94,0.25)' },
  { bgFrom: '#122018', bgTo: '#070f0a', accent: '#10b981', secondary: '#34d399', glow: 'rgba(16,185,129,0.25)' },
  { bgFrom: '#1e1428', bgTo: '#0c0712', accent: '#a855f7', secondary: '#c084fc', glow: 'rgba(168,85,247,0.25)' },
  { bgFrom: '#241a10', bgTo: '#0f0a06', accent: '#f59e0b', secondary: '#fbbf24', glow: 'rgba(245,158,11,0.25)' },
  { bgFrom: '#101c26', bgTo: '#070c12', accent: '#0ea5e9', secondary: '#38bdf8', glow: 'rgba(14,165,233,0.25)' },
  { bgFrom: '#22121e', bgTo: '#0e060c', accent: '#ec4899', secondary: '#f472b6', glow: 'rgba(236,72,153,0.25)' },
  { bgFrom: '#182012', bgTo: '#0a0f06', accent: '#84cc16', secondary: '#a3e635', glow: 'rgba(132,204,22,0.25)' },
  { bgFrom: '#201e24', bgTo: '#0c0b0e', accent: '#94a3b8', secondary: '#cbd5e1', glow: 'rgba(148,163,184,0.25)' },
  { bgFrom: '#1c1624', bgTo: '#0c0910', accent: '#8b5cf6', secondary: '#a78bfa', glow: 'rgba(139,92,246,0.25)' },
];

/** Fast deterministic string hash */
export function hashTrack(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Get deterministic color palette for a track */
export function getTrackPalette(title = '', artist = '', id = ''): Palette {
  const seed = `${title}_${artist}_${id}`;
  const idx = hashTrack(seed) % NOIR_PALETTES.length;
  return NOIR_PALETTES[idx];
}

/** Extract 1-2 character initials from title/artist */
function getInitials(title = '', artist = ''): string {
  const t = title.trim();
  const a = artist.trim();
  if (a && t) {
    const aChar = a.replace(/[^a-zA-Z0-9]/g, '')[0] || 'A';
    const tChar = t.replace(/[^a-zA-Z0-9]/g, '')[0] || 'M';
    return (aChar + tChar).toUpperCase();
  }
  if (t) {
    const words = t.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return t.slice(0, 2).toUpperCase();
  }
  return 'YT';
}

export function TrackArtwork({
  track,
  src: propSrc,
  title: propTitle,
  artist: propArtist,
  id: propId,
  size = 'fill',
  className,
  rounded = 'lg',
  showInitials = true,
}: TrackArtworkProps) {
  const [imgError, setImgError] = useState(false);
  const patternId = useId();

  const title = propTitle ?? track?.title ?? '';
  const artist = propArtist ?? track?.artist ?? '';
  const id = propId ?? track?.id ?? '';
  const src = propSrc ?? track?.thumbnailUrl;

  const isHero = size === 'hero';
  const isSm = size === 'sm' || size === 'xs';

  const hash = hashTrack(`${title}-${artist}-${id}`);
  const palette = NOIR_PALETTES[hash % NOIR_PALETTES.length];
  const patternVariant = hash % 5;
  const initials = getInitials(title, artist);

  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full',
  }[rounded];

  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    hero: 'w-full h-full',
    fill: 'w-full h-full',
  }[size];

  // If valid image exists and has not failed loading
  if (src && !imgError) {
    return (
      <div
        className={cn(
          'relative overflow-hidden bg-[#121216] border border-zinc-800/60 shrink-0 select-none',
          sizeClasses,
          roundedClasses,
          className
        )}
      >
        <Image
          src={src}
          alt={`${title || 'Track'} artwork`}
          fill
          className="object-cover transition-opacity duration-300"
          unoptimized
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // Fallback: Dynamic Generated Aesthetic SVG Artwork
  return (
    <div
      className={cn(
        'relative overflow-hidden shrink-0 select-none flex items-center justify-center border border-white/10 shadow-inner',
        sizeClasses,
        roundedClasses,
        className
      )}
      style={{
        background: `linear-gradient(135deg, ${palette.bgFrom} 0%, ${palette.bgTo} 100%)`,
      }}
      title={`${title || 'Music'} by ${artist || 'Unknown'}`}
      aria-label={`${title} artwork`}
    >
      {/* Background Subtle Gradient Glow */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 65% 30%, ${palette.accent} 0%, transparent 65%)`,
        }}
      />

      {/* SVG Generative Geometric Pattern */}
      <svg
        className="absolute inset-0 w-full h-full opacity-35 pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={`grad-${patternId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={palette.accent} stopOpacity="0.8" />
            <stop offset="100%" stopColor={palette.secondary} stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Variant 0: Concentric Vinyl Rings */}
        {patternVariant === 0 && (
          <g stroke={`url(#grad-${patternId})`} strokeWidth="0.75" fill="none">
            <circle cx="50" cy="50" r="42" />
            <circle cx="50" cy="50" r="32" strokeDasharray="3 2" />
            <circle cx="50" cy="50" r="22" />
            <circle cx="50" cy="50" r="12" strokeWidth="1" />
            <circle cx="50" cy="50" r="4" fill={palette.accent} opacity="0.6" />
          </g>
        )}

        {/* Variant 1: Acoustic Sound Waves */}
        {patternVariant === 1 && (
          <g stroke={`url(#grad-${patternId})`} strokeWidth="1.2" fill="none">
            <path d="M 0 50 Q 25 20, 50 50 T 100 50" />
            <path d="M 0 50 Q 25 35, 50 50 T 100 50" opacity="0.6" />
            <path d="M 0 50 Q 25 65, 50 50 T 100 50" opacity="0.6" />
            <path d="M 0 50 Q 25 80, 50 50 T 100 50" />
            <line x1="50" y1="15" x2="50" y2="85" strokeWidth="0.6" strokeDasharray="2 2" />
          </g>
        )}

        {/* Variant 2: Minimalist Sound Bars Equalizer */}
        {patternVariant === 2 && (
          <g fill={`url(#grad-${patternId})`} opacity="0.75">
            <rect x="18" y="45" width="6" height="15" rx="3" />
            <rect x="28" y="30" width="6" height="42" rx="3" />
            <rect x="38" y="20" width="6" height="60" rx="3" />
            <rect x="48" y="12" width="6" height="76" rx="3" />
            <rect x="58" y="26" width="6" height="48" rx="3" />
            <rect x="68" y="38" width="6" height="28" rx="3" />
            <rect x="78" y="48" width="6" height="10" rx="3" />
          </g>
        )}

        {/* Variant 3: Diagonal Bauhaus Mesh */}
        {patternVariant === 3 && (
          <g stroke={`url(#grad-${patternId})`} strokeWidth="0.8" opacity="0.6">
            <line x1="0" y1="0" x2="100" y2="100" />
            <line x1="20" y1="0" x2="100" y2="80" />
            <line x1="0" y1="20" x2="80" y2="100" />
            <line x1="40" y1="0" x2="100" y2="60" />
            <line x1="0" y1="40" x2="60" y2="100" />
            <circle cx="50" cy="50" r="16" fill={palette.bgFrom} strokeWidth="1" />
          </g>
        )}

        {/* Variant 4: Harmonic Resonance Rings & Orbital Nodes */}
        {patternVariant === 4 && (
          <g stroke={`url(#grad-${patternId})`} strokeWidth="0.7" fill="none">
            <ellipse cx="50" cy="50" rx="38" ry="24" transform="rotate(-25 50 50)" />
            <ellipse cx="50" cy="50" rx="24" ry="38" transform="rotate(25 50 50)" />
            <circle cx="50" cy="50" r="10" fill={palette.accent} fillOpacity="0.2" />
            <circle cx="50" cy="50" r="3" fill="#ffffff" fillOpacity="0.8" />
          </g>
        )}
      </svg>

      {/* Front Monogram Badge */}
      {showInitials && (
        <div
          className={cn(
            'relative z-10 font-mono-time font-bold uppercase tracking-wider text-white/90 drop-shadow-md flex items-center justify-center',
            isHero ? 'text-2xl md:text-3xl' : isSm ? 'text-[10px]' : 'text-xs'
          )}
        >
          {initials}
        </div>
      )}

      {/* Bottom Subtle Corner Glow Accent */}
      <div
        className="absolute bottom-0 right-0 w-1/2 h-1/2 opacity-30 pointer-events-none"
        style={{
          background: `radial-gradient(circle at bottom right, ${palette.secondary} 0%, transparent 70%)`,
        }}
      />
    </div>
  );
}
