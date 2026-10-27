import type { PlayRecord, Track } from '@/types';

export type StatsRange = 'week' | 'month' | 'all';

export const RANGE_LABELS: Record<StatsRange, string> = {
  week: 'This Week',
  month: 'This Month',
  all: 'All Time',
};

/** Start of the range in ms (local time). Weeks start on Monday. */
export function rangeStart(range: StatsRange, now = new Date()): number {
  if (range === 'all') return 0;
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === 'week') {
    const offset = (d.getDay() + 6) % 7; // Monday = 0
    d.setDate(d.getDate() - offset);
  } else {
    d.setDate(1);
  }
  return d.getTime();
}

export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** Consecutive days with at least one play, ending today (or yesterday if nothing yet today). */
export function currentStreak(plays: Pick<PlayRecord, 'playedAt'>[], now = new Date()): number {
  const days = new Set(plays.map((p) => dayKey(p.playedAt)));
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!days.has(dayKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor.getTime()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export interface RankedSong {
  trackId: string;
  title: string;
  artist: string;
  plays: number;
  ms: number;
}

export interface RankedArtist {
  artist: string;
  plays: number;
  ms: number;
}

export interface StatsSummary {
  totalMs: number;
  playCount: number;
  daysWithPlays: number;
  topSongs: RankedSong[];
  topArtists: RankedArtist[];
  /** Plays per local hour of day, index 0-23. */
  byHour: number[];
}

export function summarize(plays: PlayRecord[], tracks: Map<string, Track>, limit = 8): StatsSummary {
  const songs = new Map<string, RankedSong>();
  const artists = new Map<string, RankedArtist>();
  const byHour = new Array<number>(24).fill(0);
  const days = new Set<string>();
  let totalMs = 0;

  for (const p of plays) {
    totalMs += p.msListened;
    byHour[new Date(p.playedAt).getHours()] += 1;
    days.add(dayKey(p.playedAt));

    const track = tracks.get(p.trackId);
    const song = songs.get(p.trackId) ?? {
      trackId: p.trackId,
      title: track?.title ?? 'Unknown Song',
      artist: track?.artist ?? 'Unknown Artist',
      plays: 0,
      ms: 0,
    };
    song.plays += 1;
    song.ms += p.msListened;
    songs.set(p.trackId, song);

    const artistName = track?.artist?.trim() || 'Unknown Artist';
    const artist = artists.get(artistName) ?? { artist: artistName, plays: 0, ms: 0 };
    artist.plays += 1;
    artist.ms += p.msListened;
    artists.set(artistName, artist);
  }

  const byCount = <T extends { plays: number; ms: number }>(a: T, b: T) => b.plays - a.plays || b.ms - a.ms;
  return {
    totalMs,
    playCount: plays.length,
    daysWithPlays: days.size,
    topSongs: [...songs.values()].sort(byCount).slice(0, limit),
    topArtists: [...artists.values()].sort(byCount).slice(0, limit),
    byHour,
  };
}

/** "2h 5m", "42m", "less than a minute". */
export function formatListening(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 1) return ms > 0 ? 'Under 1m' : '0m';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function formatHour(hour: number): string {
  const suffix = hour < 12 ? 'AM' : 'PM';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${suffix}`;
}
