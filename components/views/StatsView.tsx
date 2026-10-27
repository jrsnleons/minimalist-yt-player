'use client';

import { useId, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BarChart3, Search } from 'lucide-react';
import { db } from '@/db/schema';
import { usePlayerStore } from '@/store/usePlayerStore';
import { EmptyState } from '@/components/ui/EmptyState';
import { TrackArtwork } from '@/components/ui/TrackArtwork';
import {
  RANGE_LABELS,
  currentStreak,
  formatHour,
  formatListening,
  rangeStart,
  summarize,
  type StatsRange,
} from '@/lib/stats';
import { cn } from '@/lib/utils';
import type { PlayRecord, Track } from '@/types';

const RANGES: StatsRange[] = ['week', 'month', 'all'];

interface StatsData {
  allPlays: Pick<PlayRecord, 'playedAt'>[];
  plays: PlayRecord[];
  tracks: Map<string, Track>;
}

function StatTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-[10px] bg-[#141418] px-4 py-3.5 min-w-0">
      <dt className="text-[13px] text-zinc-400">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tracking-tight text-white tabular-nums truncate">{value}</dd>
      {note && <p className="text-[13px] text-zinc-400 mt-0.5">{note}</p>}
    </div>
  );
}

function HourChart({ byHour }: { byHour: number[] }) {
  const max = Math.max(...byHour, 1);
  const peakHour = byHour.indexOf(Math.max(...byHour));
  const hasData = byHour.some((n) => n > 0);
  const summary = hasData
    ? `Plays by hour of day. Busiest hour is ${formatHour(peakHour)} with ${byHour[peakHour]} ${byHour[peakHour] === 1 ? 'play' : 'plays'}.`
    : 'Plays by hour of day. No plays in this range.';
  const tableId = useId();

  return (
    <div>
      <div role="img" aria-label={summary} aria-describedby={tableId}>
        <div className="flex items-end gap-[3px] h-36" aria-hidden="true">
          {byHour.map((count, hour) => (
            <div key={hour} className="flex-1 h-full flex items-end" title={`${formatHour(hour)}: ${count}`}>
              <div
                className={cn(
                  'w-full rounded-t-[3px]',
                  count === 0 ? 'bg-white/[0.08]' : hour === peakHour ? 'bg-[var(--track-accent,#e9b44c)]' : 'bg-white/60'
                )}
                style={{ height: count === 0 ? '2px' : `${Math.max(6, (count / max) * 100)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-zinc-400 font-mono" aria-hidden="true">
          <span>12 AM</span>
          <span>6 AM</span>
          <span>12 PM</span>
          <span>6 PM</span>
          <span>11 PM</span>
        </div>
      </div>
      <table id={tableId} className="sr-only">
        <caption>Plays by hour of day</caption>
        <thead>
          <tr>
            <th scope="col">Hour</th>
            <th scope="col">Plays</th>
          </tr>
        </thead>
        <tbody>
          {byHour.map((count, hour) => (
            <tr key={hour}>
              <th scope="row">{formatHour(hour)}</th>
              <td>{count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RankList({
  title,
  id,
  items,
}: {
  title: string;
  id: string;
  items: { key: string; primary: string; secondary: string; plays: number; track?: Partial<Track> }[];
}) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="text-xl font-semibold tracking-tight text-white mb-3">
        {title}
      </h2>
      <ol className="flex flex-col">
        {items.map((item, i) => (
          <li key={item.key} className="flex items-center gap-3 py-1.5 min-h-[48px] border-b border-white/[0.04]">
            <span className="w-6 text-right font-mono text-[13px] text-zinc-400 tabular-nums">{i + 1}</span>
            {item.track && <TrackArtwork track={item.track} size="md" rounded="md" />}
            <span className="min-w-0 flex-1 flex flex-col">
              <span className="truncate text-sm font-medium text-zinc-100">{item.primary}</span>
              <span className="truncate text-[13px] text-zinc-400">{item.secondary}</span>
            </span>
            <span className="text-[13px] text-zinc-300 tabular-nums shrink-0">
              {item.plays} {item.plays === 1 ? 'play' : 'plays'}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function StatsView() {
  const [range, setRange] = useState<StatsRange>('week');
  const toggleCommandPalette = usePlayerStore((s) => s.toggleCommandPalette);

  const data = useLiveQuery<StatsData>(async () => {
    const [allPlays, plays] = await Promise.all([
      db.plays.orderBy('playedAt').toArray(),
      db.plays.where('playedAt').aboveOrEqual(rangeStart(range)).toArray(),
    ]);
    const ids = [...new Set(allPlays.map((p) => p.trackId))];
    const rows = await db.tracks.bulkGet(ids);
    const tracks = new Map<string, Track>();
    rows.forEach((t) => t && tracks.set(t.id, t));
    return { allPlays, plays, tracks };
  }, [range]);

  const summary = useMemo(() => (data ? summarize(data.plays, data.tracks) : null), [data]);
  const streak = useMemo(() => (data ? currentStreak(data.allPlays) : 0), [data]);

  const hasAnyPlays = !!data && data.allPlays.length > 0;
  const hasRangePlays = !!summary && summary.playCount > 0;

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5 shrink-0">
        <h1 className="text-[32px] leading-tight font-bold tracking-tight text-white">Stats</h1>
        <div role="group" aria-label="Time range" className="flex items-center gap-1 p-1 rounded-[10px] bg-[#141418]">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              aria-pressed={range === r}
              className={cn(
                'px-3 min-h-[36px] rounded-lg text-sm font-medium transition-colors cursor-pointer',
                range === r ? 'bg-[#f4f4f6] text-[#0b0b0e] font-semibold' : 'text-zinc-300 hover:text-white hover:bg-white/[0.08]'
              )}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-y-auto flex-1 min-h-0 pb-8">
        {!data ? (
          <p className="py-16 text-center text-sm text-zinc-400" role="status">
            Loading stats…
          </p>
        ) : !hasAnyPlays ? (
          <EmptyState
            icon={<BarChart3 size={28} />}
            title="No listening data yet"
            description="A song is counted after it plays for 30 seconds or half its length. Stats stay in this browser."
          >
            <button
              type="button"
              onClick={toggleCommandPalette}
              className="flex items-center gap-2 px-3.5 rounded-lg bg-[#f4f4f6] text-[#0b0b0e] text-sm font-semibold hover:bg-white transition-colors cursor-pointer min-h-[40px]"
            >
              <Search size={16} aria-hidden="true" />
              <span>Find Something to Play</span>
            </button>
          </EmptyState>
        ) : (
          <div className="flex flex-col gap-9">
            <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatTile label="Listening Time" value={formatListening(summary!.totalMs)} />
              <StatTile label="Songs Played" value={String(summary!.playCount)} />
              <StatTile
                label="Days Listened"
                value={String(summary!.daysWithPlays)}
                note={range === 'all' ? undefined : `in ${RANGE_LABELS[range].toLowerCase()}`}
              />
              <StatTile
                label="Current Streak"
                value={`${streak} ${streak === 1 ? 'day' : 'days'}`}
                note={streak === 0 ? 'No plays today or yesterday' : undefined}
              />
            </dl>

            {!hasRangePlays ? (
              <EmptyState
                icon={<BarChart3 size={28} />}
                title={`No plays ${range === 'all' ? 'yet' : RANGE_LABELS[range].toLowerCase()}`}
                description="Try a longer range."
                className="py-8"
              />
            ) : (
              <>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-10 gap-y-9">
                  <RankList
                    id="stats-songs"
                    title="Top Songs"
                    items={summary!.topSongs.map((s) => ({
                      key: s.trackId,
                      primary: s.title,
                      secondary: `${s.artist} · ${formatListening(s.ms)}`,
                      plays: s.plays,
                      track: data.tracks.get(s.trackId),
                    }))}
                  />
                  <RankList
                    id="stats-artists"
                    title="Top Artists"
                    items={summary!.topArtists.map((a) => ({
                      key: a.artist,
                      primary: a.artist,
                      secondary: formatListening(a.ms),
                      plays: a.plays,
                    }))}
                  />
                </div>

                <section aria-labelledby="stats-hours">
                  <h2 id="stats-hours" className="text-xl font-semibold tracking-tight text-white mb-3">
                    Listening by Hour
                  </h2>
                  <HourChart byHour={summary!.byHour} />
                </section>
              </>
            )}

            <p className="text-[13px] text-zinc-400">
              Counts songs played for at least 30 seconds or half their length. Data is stored in this browser only.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
