/**
 * Two-element audio engine for the direct (non-iframe) playback mode.
 *
 * Two <audio> elements (A/B) are routed through per-slot GainNodes into a master
 * GainNode (user volume). The idle element preloads the upcoming track so the
 * hand-off is gapless (crossfade 0) or an equal-power crossfade (crossfade N).
 *
 * The engine is framework-free and dependency-injected so it can be driven by a
 * deterministic test harness: it never touches the store or the network directly.
 */

export interface StreamResult {
  url: string;
  /** YouTube loudness relative to reference, dB. Positive = louder than reference. */
  loudnessDb?: number | null;
}

export interface EngineSettings {
  /** 0-100 */
  volume: number;
  muted: boolean;
  /** Crossfade seconds, 0 = gapless. */
  crossfade: number;
  normalize: boolean;
  playing: boolean;
}

export interface EngineOptions {
  resolve: (trackId: string, signal: AbortSignal) => Promise<StreamResult>;
  /** Id of the track that advance() will move to, or null (repeat-one / end of queue). */
  peekNext: () => string | null;
  /** Move the app state to the next track (store.next). */
  advance: () => void;
  /** Id of the app's current track (to detect advance() that stays on the same track). */
  getCurrentTrackId: () => string | null;
  getSettings: () => EngineSettings;
  onProgress: (seconds: number) => void;
  onDuration: (seconds: number) => void;
  onError: (message: string) => void;
  /** Use Web Audio GainNodes. Falls back to element.volume if unavailable or CORS blocks it. */
  useWebAudio?: boolean;
  /** Test hook: receives the master node and context to tap the mixed output. */
  tap?: (master: GainNode, ctx: AudioContext) => void;
  /** Test hook: observe engine events. */
  log?: (event: string, data?: Record<string, unknown>) => void;
}

interface Slot {
  name: 'A' | 'B';
  el: HTMLAudioElement;
  source: MediaElementAudioSourceNode | null;
  gain: GainNode | null;
  trackId: string | null;
  loudnessDb: number | null;
  /** 0..1 fade multiplier (crossfade envelope) */
  fade: number;
  ready: boolean;
}

interface Preload {
  trackId: string;
  controller: AbortController;
  failed: boolean;
}

interface Fade {
  out: Slot;
  inc: Slot;
  seconds: number;
  /** seconds of fade already elapsed while running */
  elapsed: number;
  /** performance.now() when last resumed, null when paused */
  resumedAt: number | null;
  finishTimer: ReturnType<typeof setTimeout> | null;
  interval: ReturnType<typeof setInterval> | null;
}

/** Start preloading when this many seconds (plus the crossfade) remain. */
const PRELOAD_LEAD_SEC = 25;
/** Overlap used for the "gapless" hand-off: absorbs timer jitter and decoder start-up. */
const GAP_LEAD_SEC = 0.03;
const MAX_NORMALIZE_ATTENUATION = 0.25; // -12 dB floor
const CURVE_POINTS = 64;

export function normalizationGain(loudnessDb: number | null | undefined, enabled: boolean): number {
  if (!enabled || typeof loudnessDb !== 'number' || !Number.isFinite(loudnessDb) || loudnessDb <= 0) {
    return 1; // never boost
  }
  return Math.max(MAX_NORMALIZE_ATTENUATION, Math.min(1, Math.pow(10, -loudnessDb / 20)));
}

export class AudioEngine {
  private opts: EngineOptions;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private webAudio = false;
  private slots: Slot[] = [];
  private active!: Slot;
  /** Slot available for preloading; null while it is busy fading out. */
  private idle: Slot | null = null;
  private activeTrackId: string | null = null;
  private preload: Preload | null = null;
  private fade: Fade | null = null;
  private loadController: AbortController | null = null;
  private transitionTimer: ReturnType<typeof setTimeout> | null = null;
  private retryCount = 0;
  private hasPlayed = false;
  private rate = 1;
  private destroyed = false;

  constructor(opts: EngineOptions) {
    this.opts = opts;
    this.build(opts.useWebAudio !== false);
  }

  // ---------------------------------------------------------------- setup

  private build(useWebAudio: boolean) {
    this.webAudio = false;
    if (useWebAudio && typeof window !== 'undefined') {
      try {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Ctor) {
          this.ctx = new Ctor({ latencyHint: 'playback' });
          this.master = this.ctx.createGain();
          this.master.connect(this.ctx.destination);
          this.webAudio = true;
          this.opts.tap?.(this.master, this.ctx);
        }
      } catch {
        this.ctx = null;
        this.master = null;
      }
    }
    this.slots = [this.createSlot('A'), this.createSlot('B')];
    this.active = this.slots[0];
    this.idle = this.slots[1];
    this.applySettings();
  }

  private createSlot(name: 'A' | 'B'): Slot {
    const el = new Audio();
    el.preload = 'auto';
    el.preservesPitch = true;
    el.playbackRate = this.rate;
    let source: MediaElementAudioSourceNode | null = null;
    let gain: GainNode | null = null;
    if (this.webAudio && this.ctx && this.master) {
      // Required for Web Audio to read cross-origin media samples.
      el.crossOrigin = 'anonymous';
      source = this.ctx.createMediaElementSource(el);
      gain = this.ctx.createGain();
      source.connect(gain);
      gain.connect(this.master);
    }
    const slot: Slot = { name, el, source, gain, trackId: null, loudnessDb: null, fade: 1, ready: false };

    el.addEventListener('timeupdate', () => this.onTimeUpdate(slot));
    el.addEventListener('durationchange', () => {
      if (slot === this.active && Number.isFinite(el.duration)) this.opts.onDuration(el.duration);
    });
    el.addEventListener('ended', () => this.onEnded(slot));
    el.addEventListener('error', () => this.onElementError(slot));
    el.addEventListener('seeked', () => {
      if (slot === this.active) this.armTransition();
    });
    el.addEventListener('playing', () => {
      if (slot === this.active) this.hasPlayed = true;
    });
    el.addEventListener('canplay', () => {
      slot.ready = true;
      if (slot !== this.active) {
        this.opts.log?.('preload-ready', { slot: slot.name, trackId: slot.trackId });
        this.armTransition();
      }
    });
    return slot;
  }

  private releaseSlot(slot: Slot) {
    try {
      slot.el.pause();
      slot.el.removeAttribute('src');
      slot.el.load(); // drops buffers and cancels the network request
    } catch {
      /* ignore */
    }
    slot.trackId = null;
    slot.loudnessDb = null;
    slot.ready = false;
    slot.fade = 1;
    this.applySlotGain(slot);
  }

  // ----------------------------------------------------------------- gains

  private userGain(): number {
    const s = this.opts.getSettings();
    return s.muted ? 0 : Math.max(0, Math.min(1, s.volume / 100));
  }

  private norm(slot: Slot): number {
    return normalizationGain(slot.loudnessDb, this.opts.getSettings().normalize);
  }

  /** Static (non-ramping) gain for a slot. */
  private applySlotGain(slot: Slot) {
    const level = slot.fade * this.norm(slot);
    if (slot.gain && this.ctx) {
      slot.gain.gain.cancelScheduledValues(this.ctx.currentTime);
      slot.gain.gain.setValueAtTime(level, this.ctx.currentTime);
      slot.el.volume = 1;
    } else {
      slot.el.volume = Math.max(0, Math.min(1, level * this.userGain()));
    }
  }

  /** Re-read volume / mute / normalize settings. */
  applySettings() {
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.userGain(), this.ctx.currentTime, 0.01);
    }
    for (const slot of this.slots) {
      if (this.fade && (slot === this.fade.out || slot === this.fade.inc)) {
        // Mid-fade: re-issue the envelope from the current position so norm changes apply.
        continue;
      }
      this.applySlotGain(slot);
    }
    if (this.fade) this.reschedule(this.fadeProgress());
    this.armTransition();
  }

  setPlaybackRate(rate: number) {
    this.rate = rate;
    for (const slot of this.slots) {
      slot.el.playbackRate = rate;
      slot.el.preservesPitch = true;
    }
    this.armTransition();
  }

  // ------------------------------------------------------------ public API

  /** Called whenever the app's current track changes. Idempotent for the engine's own hand-offs. */
  setTrack(trackId: string | null) {
    if (this.destroyed) return;
    if (!trackId) return;
    if (trackId === this.activeTrackId) return;

    this.opts.log?.('set-track', { trackId });
    this.clearTransitionTimer();
    this.finishFade(true);
    this.loadController?.abort();
    this.loadController = null;
    this.retryCount = 0;
    this.hasPlayed = false;

    const prepared = this.idle;
    if (
      prepared &&
      this.preload &&
      this.preload.trackId === trackId &&
      !this.preload.failed &&
      prepared.trackId === trackId &&
      prepared.el.getAttribute('src')
    ) {
      // The skipped-to track is already buffered: swap instantly.
      const old = this.active;
      this.active = prepared;
      this.idle = old;
      this.activeTrackId = trackId;
      this.preload = null;
      this.releaseSlot(old);
      prepared.fade = 1;
      prepared.el.currentTime = 0;
      this.applySlotGain(prepared);
      this.opts.onDuration(Number.isFinite(prepared.el.duration) ? prepared.el.duration : 0);
      if (this.opts.getSettings().playing) this.safePlay(prepared);
      this.opts.log?.('swap-preloaded', { trackId });
      this.reconcilePreload();
      return;
    }

    // Normal load into the active element.
    this.dropPreload();
    const slot = this.active;
    this.activeTrackId = trackId;
    slot.trackId = trackId;
    slot.loudnessDb = null;
    slot.ready = false;
    slot.fade = 1;
    const controller = new AbortController();
    this.loadController = controller;
    this.opts
      .resolve(trackId, controller.signal)
      .then((res) => {
        if (controller.signal.aborted || this.destroyed || this.active !== slot) return;
        slot.loudnessDb = res.loudnessDb ?? null;
        this.applySlotGain(slot);
        slot.el.src = res.url;
        if (this.opts.getSettings().playing) this.safePlay(slot);
      })
      .catch((err) => {
        if ((err as Error)?.name === 'AbortError') return;
        this.opts.onError('Direct audio extraction in experimental mode — fallback active');
      });
  }

  setPlaying(playing: boolean) {
    if (this.destroyed) return;
    if (playing) {
      this.ctx?.resume().catch(() => {});
      if (this.active.el.getAttribute('src')) this.safePlay(this.active);
      if (this.fade) {
        this.safePlay(this.fade.out);
        this.resumeFade();
      }
      this.armTransition();
    } else {
      this.active.el.pause();
      if (this.fade) {
        this.freezeFade();
        this.fade.out.el.pause();
      }
      this.clearTransitionTimer();
    }
  }

  seek(seconds: number) {
    if (this.destroyed) return;
    // A seek means the user wants this track here: cancel any hand-off in progress.
    if (this.fade) this.finishFade(true);
    this.clearTransitionTimer();
    this.reconcilePreload();
    try {
      this.active.el.currentTime = seconds;
      if (this.opts.getSettings().playing) this.safePlay(this.active);
    } catch {
      /* not seekable yet */
    }
  }

  /** The queue / repeat / shuffle state changed: re-validate the preloaded track. */
  onQueueChanged() {
    if (this.destroyed) return;
    this.reconcilePreload();
    this.armTransition();
  }

  destroy() {
    this.destroyed = true;
    this.clearTransitionTimer();
    this.loadController?.abort();
    this.dropPreload();
    this.finishFade(true);
    for (const slot of this.slots) {
      this.releaseSlot(slot);
      try {
        slot.source?.disconnect();
        slot.gain?.disconnect();
      } catch {
        /* ignore */
      }
    }
    try {
      this.master?.disconnect();
      this.ctx?.close().catch(() => {});
    } catch {
      /* ignore */
    }
    this.slots = [];
    this.ctx = null;
    this.master = null;
  }

  /** Diagnostics for tests. */
  debugState() {
    return {
      activeSlot: this.active.name,
      activeTrackId: this.activeTrackId,
      idleTrackId: this.idle?.trackId ?? null,
      fading: !!this.fade,
      webAudio: this.webAudio,
      gains: this.slots.map((s) => ({
        slot: s.name,
        node: s.gain ? s.gain.gain.value : null,
        elementVolume: s.el.volume,
        hasSrc: !!s.el.getAttribute('src'),
        currentTime: s.el.currentTime,
        paused: s.el.paused,
      })),
      master: this.master?.gain.value ?? null,
      ctxState: this.ctx?.state ?? null,
    };
  }

  // ------------------------------------------------------------ playback

  private safePlay(slot: Slot) {
    const p = slot.el.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  }

  private onTimeUpdate(slot: Slot) {
    if (slot !== this.active) return;
    const t = slot.el.currentTime;
    if (Number.isFinite(t)) this.opts.onProgress(t);
    this.reconcilePreload();
    this.armTransition();
  }

  private onEnded(slot: Slot) {
    if (slot !== this.active || this.destroyed) return;
    this.opts.log?.('ended', { slot: slot.name });
    this.opts.advance();
    // advance() that lands on the same track (repeat-one / single-track repeat-all)
    // doesn't change the track id, so restart in place.
    if (this.opts.getCurrentTrackId() === this.activeTrackId && this.opts.getSettings().playing) {
      slot.el.currentTime = 0;
      this.safePlay(slot);
    }
  }

  private onElementError(slot: Slot) {
    if (this.destroyed || !slot.el.getAttribute('src')) return;
    if (slot !== this.active) {
      // Preload failed (e.g. expired URL): drop it; the normal load path takes over.
      if (this.preload && slot.trackId === this.preload.trackId) {
        this.opts.log?.('preload-error', { trackId: slot.trackId });
        this.preload.failed = true;
        this.releaseSlot(slot);
      }
      return;
    }
    const id = this.activeTrackId;
    if (!id) return;

    // CORS refusal with Web Audio: rebuild without the graph (element.volume instead).
    if (this.webAudio && !this.hasPlayed && this.retryCount === 0) {
      this.opts.log?.('degrade-plain');
      const at = slot.el.currentTime || 0;
      this.degradeToPlainElements(id, at);
      return;
    }
    if (this.retryCount >= 1) {
      this.opts.onError('Direct stream unavailable for this track');
      this.retryCount = 0;
      return;
    }
    this.retryCount += 1;
    const at = slot.el.currentTime || 0;
    const controller = new AbortController();
    this.loadController?.abort();
    this.loadController = controller;
    this.opts
      .resolve(id, controller.signal)
      .then((res) => {
        if (controller.signal.aborted || this.active !== slot || this.activeTrackId !== id) return;
        slot.loudnessDb = res.loudnessDb ?? slot.loudnessDb;
        slot.el.src = res.url;
        slot.el.currentTime = at;
        this.applySlotGain(slot);
        if (this.opts.getSettings().playing) this.safePlay(slot);
      })
      .catch(() => {
        this.opts.onError('Direct stream unavailable for this track');
        this.retryCount = 0;
      });
  }

  private degradeToPlainElements(trackId: string, at: number) {
    this.clearTransitionTimer();
    this.loadController?.abort();
    this.dropPreload();
    this.finishFade(true);
    for (const slot of this.slots) {
      this.releaseSlot(slot);
      try {
        slot.source?.disconnect();
        slot.gain?.disconnect();
      } catch {
        /* ignore */
      }
    }
    try {
      this.master?.disconnect();
      this.ctx?.close().catch(() => {});
    } catch {
      /* ignore */
    }
    this.ctx = null;
    this.master = null;
    this.activeTrackId = null;
    this.build(false);
    this.setTrack(trackId);
    if (at > 1) {
      const slot = this.active;
      const restore = () => {
        try {
          slot.el.currentTime = at;
        } catch {
          /* ignore */
        }
        slot.el.removeEventListener('loadedmetadata', restore);
      };
      slot.el.addEventListener('loadedmetadata', restore);
    }
  }

  // ---------------------------------------------------------- preloading

  private dropPreload() {
    if (this.preload) {
      this.preload.controller.abort();
      this.preload = null;
    }
    if (this.idle && (this.idle.trackId || this.idle.el.getAttribute('src'))) {
      this.releaseSlot(this.idle);
    }
  }

  private secondsRemaining(): number {
    const el = this.active.el;
    if (!Number.isFinite(el.duration) || el.duration <= 0) return Infinity;
    return Math.max(0, (el.duration - el.currentTime) / (this.rate || 1));
  }

  private reconcilePreload() {
    if (this.destroyed || !this.idle || this.fade) return;
    const nextId = this.opts.peekNext();
    if (!nextId || nextId === this.activeTrackId) {
      if (this.preload || this.idle.trackId) this.dropPreload();
      return;
    }
    if (this.preload && this.preload.trackId !== nextId) {
      this.opts.log?.('preload-stale', { had: this.preload.trackId, want: nextId });
      this.dropPreload();
    }
    if (this.preload) return;

    const settings = this.opts.getSettings();
    const window_ = PRELOAD_LEAD_SEC + settings.crossfade;
    if (this.secondsRemaining() > window_) return;
    this.startPreload(nextId);
  }

  private startPreload(trackId: string) {
    const slot = this.idle;
    if (!slot) return;
    const controller = new AbortController();
    const preload: Preload = { trackId, controller, failed: false };
    this.preload = preload;
    slot.trackId = trackId;
    slot.ready = false;
    this.opts.log?.('preload-start', { trackId });
    this.opts
      .resolve(trackId, controller.signal)
      .then((res) => {
        if (controller.signal.aborted || this.preload !== preload || this.idle !== slot) return;
        slot.loudnessDb = res.loudnessDb ?? null;
        slot.fade = 0;
        this.applySlotGain(slot);
        slot.el.playbackRate = this.rate;
        slot.el.src = res.url;
        slot.el.load();
      })
      .catch(() => {
        if (this.preload === preload) {
          preload.failed = true; // fall back to the normal load path at track end
          slot.trackId = null;
        }
      });
  }

  // ---------------------------------------------------------- transitions

  private clearTransitionTimer() {
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }
  }

  private effectiveFadeSeconds(remaining: number): number {
    const xf = this.opts.getSettings().crossfade;
    const dur = this.active.el.duration;
    const wanted = xf > 0 ? Math.min(xf, Number.isFinite(dur) ? dur * 0.4 : xf) : GAP_LEAD_SEC;
    return Math.max(GAP_LEAD_SEC, Math.min(wanted, remaining));
  }

  private preloadReady(nextId: string): boolean {
    const slot = this.idle;
    return !!(
      slot &&
      this.preload &&
      !this.preload.failed &&
      this.preload.trackId === nextId &&
      slot.trackId === nextId &&
      slot.el.getAttribute('src') &&
      slot.el.readyState >= 2
    );
  }

  /** (Re)schedule the hand-off timer for the moment the fade must start. */
  private armTransition() {
    this.clearTransitionTimer();
    if (this.destroyed || this.fade) return;
    const settings = this.opts.getSettings();
    if (!settings.playing || this.active.el.paused) return;
    const nextId = this.opts.peekNext();
    if (!nextId || nextId === this.activeTrackId) return;
    if (!this.preloadReady(nextId)) return;

    const remaining = this.secondsRemaining();
    if (!Number.isFinite(remaining)) return;
    const fadeSec = this.effectiveFadeSeconds(remaining);
    const delayMs = (remaining - fadeSec) * 1000;
    if (remaining < GAP_LEAD_SEC / 2) return; // too late; 'ended' will do a normal advance
    this.transitionTimer = setTimeout(() => {
      this.transitionTimer = null;
      this.runTransition();
    }, Math.max(0, delayMs));
  }

  private runTransition() {
    if (this.destroyed || this.fade) return;
    const nextId = this.opts.peekNext();
    const settings = this.opts.getSettings();
    if (!settings.playing || !nextId || !this.preloadReady(nextId)) return;
    const out = this.active;
    const inc = this.idle!;
    const remaining = this.secondsRemaining();
    const seconds = this.effectiveFadeSeconds(remaining);

    this.opts.log?.('transition-start', {
      from: this.activeTrackId,
      to: nextId,
      seconds,
      remaining,
      at: performance.now(),
    });

    inc.fade = 0;
    inc.el.currentTime = 0;
    inc.el.playbackRate = this.rate;
    this.applySlotGain(inc);
    this.applySlotGain(out);
    this.ctx?.resume().catch(() => {});
    this.safePlay(inc);

    // Swap roles now; the outgoing slot is busy until the fade finishes.
    this.active = inc;
    this.idle = null;
    this.activeTrackId = nextId;
    this.preload = null;
    this.retryCount = 0;
    this.hasPlayed = true;

    this.fade = { out, inc, seconds, elapsed: 0, resumedAt: performance.now(), finishTimer: null, interval: null };
    this.reschedule(0);

    this.opts.onDuration(Number.isFinite(inc.el.duration) ? inc.el.duration : 0);
    this.opts.advance(); // store.next(): setTrack(nextId) is a no-op now
  }

  // ----------------------------------------------------------------- fades

  private fadeProgress(): number {
    const f = this.fade;
    if (!f) return 1;
    const running = f.resumedAt !== null ? (performance.now() - f.resumedAt) / 1000 : 0;
    return Math.max(0, Math.min(1, (f.elapsed + running) / f.seconds));
  }

  private clearFadeTimers(f: Fade) {
    if (f.finishTimer) clearTimeout(f.finishTimer);
    if (f.interval) clearInterval(f.interval);
    f.finishTimer = null;
    f.interval = null;
  }

  /** Apply the equal-power envelope from progress p to 1. */
  private reschedule(p: number) {
    const f = this.fade;
    if (!f) return;
    this.clearFadeTimers(f);
    f.elapsed = p * f.seconds;
    f.resumedAt = performance.now();
    const remainingSec = Math.max(0.001, f.seconds * (1 - p));
    const outNorm = this.norm(f.out);
    const incNorm = this.norm(f.inc);

    if (this.ctx && f.out.gain && f.inc.gain) {
      const now = this.ctx.currentTime;
      const outCurve = new Float32Array(CURVE_POINTS);
      const incCurve = new Float32Array(CURVE_POINTS);
      for (let i = 0; i < CURVE_POINTS; i++) {
        const q = p + (1 - p) * (i / (CURVE_POINTS - 1));
        outCurve[i] = Math.cos(q * Math.PI * 0.5) * outNorm;
        incCurve[i] = Math.sin(q * Math.PI * 0.5) * incNorm;
      }
      f.out.gain.gain.cancelScheduledValues(now);
      f.inc.gain.gain.cancelScheduledValues(now);
      f.out.gain.gain.setValueCurveAtTime(outCurve, now, remainingSec);
      f.inc.gain.gain.setValueCurveAtTime(incCurve, now, remainingSec);
    } else {
      const user = this.userGain();
      const step = () => {
        const q = this.fadeProgress();
        f.out.fade = Math.cos(q * Math.PI * 0.5);
        f.inc.fade = Math.sin(q * Math.PI * 0.5);
        f.out.el.volume = Math.max(0, Math.min(1, f.out.fade * outNorm * user));
        f.inc.el.volume = Math.max(0, Math.min(1, f.inc.fade * incNorm * user));
      };
      step();
      f.interval = setInterval(step, 40);
    }
    f.finishTimer = setTimeout(() => this.finishFade(false), remainingSec * 1000 + 30);
  }

  /** Pause the envelope (user paused mid-fade). */
  private freezeFade() {
    const f = this.fade;
    if (!f || f.resumedAt === null) return;
    const p = this.fadeProgress();
    this.clearFadeTimers(f);
    f.elapsed = p * f.seconds;
    f.resumedAt = null;
    f.out.fade = Math.cos(p * Math.PI * 0.5);
    f.inc.fade = Math.sin(p * Math.PI * 0.5);
    this.applySlotGain(f.out);
    this.applySlotGain(f.inc);
  }

  private resumeFade() {
    const f = this.fade;
    if (!f || f.resumedAt !== null) return;
    this.reschedule(Math.max(0, Math.min(1, f.elapsed / f.seconds)));
  }

  /** Complete (or cancel) the crossfade: silence and free the outgoing element. */
  private finishFade(cancelled: boolean) {
    const f = this.fade;
    if (!f) return;
    this.clearFadeTimers(f);
    this.fade = null;
    this.releaseSlot(f.out);
    f.inc.fade = 1;
    this.applySlotGain(f.inc);
    if (cancelled && !this.destroyed) {
      this.opts.log?.('fade-cancelled');
    } else {
      this.opts.log?.('fade-complete', { at: performance.now() });
    }
    if (!this.destroyed) {
      this.idle = f.out;
      if (!cancelled) {
        this.reconcilePreload();
        this.armTransition();
      }
    }
  }
}
