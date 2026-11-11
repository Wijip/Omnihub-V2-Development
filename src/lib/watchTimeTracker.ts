export interface WatchTimeFlushOptions {
  /** Use true on playback end, pagehide, or unmount to round tail remainder (>= 0.8s -> 1s). */
  final?: boolean;
  /** Hints the transport callback to use keepalive fetch so unload/navigation requests survive. */
  keepalive?: boolean;
}

export interface MediaProgressSample {
  currentTime: number;
  playing: boolean;
  seeking?: boolean;
  playbackRate?: number;
  nowMs?: number;
}

export interface WatchTimeTracker {
  beginSeeking: () => void;
  endSeeking: (currentTime?: number, playing?: boolean, nowMs?: number) => void;
  recordProgress: (sample: MediaProgressSample) => number;
  stopAt: (currentTime?: number, playbackRate?: number, nowMs?: number) => void;
  flush: (options?: WatchTimeFlushOptions) => number;
  restore: (seconds: number) => void;
  getPendingSeconds: () => number;
}

const DISCONTINUITY_WALL_TOLERANCE_SEC = 0.75;
const EARN_WALL_PADDING_SEC = 0.2;
const MAX_SINGLE_STEP_SECONDS = 30;
const FINAL_ROUND_THRESHOLD_SECONDS = 0.8;

/**
 * Tracks actual video timeline progression (`video.currentTime` delta), bounded by
 * elapsed wall clock and playback rate so buffering, paused gaps, tab switches,
 * and timeline seeks never inflate recorded watch time.
 */
export function createWatchTimeTracker(
  onFlush: (seconds: number, keepalive: boolean) => void
): WatchTimeTracker {
  let lastMediaTime: number | null = null;
  let lastWallMs: number | null = null;
  let isSeeking = false;
  let pendingSeconds = 0;

  return {
    beginSeeking() {
      isSeeking = true;
      lastMediaTime = null;
      lastWallMs = null;
    },

    endSeeking(currentTime?: number, playing = false, nowMs = Date.now()) {
      isSeeking = false;
      if (playing && typeof currentTime === 'number' && Number.isFinite(currentTime) && currentTime >= 0) {
        lastMediaTime = currentTime;
        lastWallMs = nowMs;
      } else {
        lastMediaTime = null;
        lastWallMs = null;
      }
    },

    recordProgress({
      currentTime,
      playing,
      seeking = false,
      playbackRate = 1,
      nowMs = Date.now(),
    }: MediaProgressSample) {
      if (seeking || isSeeking || !playing || !Number.isFinite(currentTime) || currentTime < 0) {
        lastMediaTime = null;
        lastWallMs = null;
        return 0;
      }

      if (lastMediaTime === null || lastWallMs === null) {
        lastMediaTime = currentTime;
        lastWallMs = nowMs;
        return 0;
      }

      const mediaDelta = currentTime - lastMediaTime;
      const wallDelta = Math.max(0, (nowMs - lastWallMs) / 1000);
      const safeRate = Math.min(Math.max(Number(playbackRate) || 1, 0.25), 4);

      lastMediaTime = currentTime;
      lastWallMs = nowMs;

      if (mediaDelta <= 0) {
        return 0;
      }

      // Skip scrub/seek jumps or post-resume discontinuities rather than counting skipped segments
      const maxContinuousMedia = wallDelta * safeRate + DISCONTINUITY_WALL_TOLERANCE_SEC;
      if (mediaDelta > maxContinuousMedia) {
        return 0;
      }

      const earned = Math.min(mediaDelta, wallDelta * safeRate + EARN_WALL_PADDING_SEC, MAX_SINGLE_STEP_SECONDS);
      if (earned > 0) {
        pendingSeconds += earned;
      }
      return earned;
    },

    stopAt(currentTime?: number, playbackRate = 1, nowMs = Date.now()) {
      if (
        !isSeeking &&
        lastMediaTime !== null &&
        lastWallMs !== null &&
        typeof currentTime === 'number' &&
        Number.isFinite(currentTime) &&
        currentTime >= 0
      ) {
        this.recordProgress({
          currentTime,
          playing: true,
          seeking: false,
          playbackRate,
          nowMs,
        });
      }
      lastMediaTime = null;
      lastWallMs = null;
    },

    flush({ final = false, keepalive = false }: WatchTimeFlushOptions = {}) {
      const secondsToSend = final
        ? (pendingSeconds >= FINAL_ROUND_THRESHOLD_SECONDS ? Math.max(1, Math.round(pendingSeconds)) : 0)
        : Math.floor(pendingSeconds);

      if (secondsToSend < 1) {
        return 0;
      }

      pendingSeconds = Math.max(0, pendingSeconds - secondsToSend);
      onFlush(secondsToSend, keepalive);
      return secondsToSend;
    },

    restore(seconds: number) {
      if (Number.isFinite(seconds) && seconds > 0) {
        pendingSeconds += seconds;
      }
    },

    getPendingSeconds() {
      return pendingSeconds;
    },
  };
}
