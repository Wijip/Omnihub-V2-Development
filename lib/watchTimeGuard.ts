export const WATCH_TIME_ENGINE = 'media-sync-v2' as const;
export const MAX_WATCH_STEP_SECONDS = 15;
export const INITIAL_SESSION_CAP_SECONDS = 10;
export const ANON_INITIAL_CAP_SECONDS = 6;
export const MAX_SESSION_BUDGET_SECONDS = 15;
export const ANON_MAX_BUDGET_SECONDS = 10;
const SESSION_TTL_MS = 30 * 60 * 1000;
const MAX_TRACKED_SESSIONS = 5000;

export interface WatchSessionEntry {
  lastAtMs: number;
  budgetSec: number;
}

export interface ClaimWatchSessionInput {
  sessionId?: unknown;
  fallbackIp?: string;
  videoId: number;
  requestedSeconds: number;
  nowMs?: number;
}

export interface ClaimWatchSessionResult {
  allowedSeconds: number;
  throttled: boolean;
  sessionKey: string;
  usedFallbackKey: boolean;
}

export interface HeartbeatValidationResult {
  valid: boolean;
  ignoreReason?: 'empty' | 'non_positive' | 'invalid_current_time' | 'oversized_current_time' | 'invalid_playback_rate';
  requestedSeconds: number;
}

/**
 * Memvalidasi payload heartbeat watch time sebelum diproses ke database
 * agar nilai negatif, NaN, atau posisi waktu melebihi durasi video ditolak.
 */
export function validateHeartbeatPayload(body: Record<string, unknown> | undefined | null): HeartbeatValidationResult {
  const rawSeconds = body?.seconds ?? body?.duration;
  if (rawSeconds === undefined || rawSeconds === null || rawSeconds === '') {
    return { valid: true, ignoreReason: 'empty', requestedSeconds: 0 };
  }

  const parsedSeconds = Number(rawSeconds);
  if (!Number.isFinite(parsedSeconds) || parsedSeconds <= 0) {
    return { valid: true, ignoreReason: 'non_positive', requestedSeconds: 0 };
  }

  if (body?.currentTime !== undefined && body?.currentTime !== null && body?.currentTime !== '') {
    const currentTime = Number(body.currentTime);
    if (!Number.isFinite(currentTime) || currentTime < -0.5) {
      return { valid: false, ignoreReason: 'invalid_current_time', requestedSeconds: 0 };
    }

    const rawDuration = body?.videoDuration;
    if (rawDuration !== undefined && rawDuration !== null && rawDuration !== '') {
      const videoDuration = Number(rawDuration);
      if (Number.isFinite(videoDuration) && videoDuration > 0 && currentTime > videoDuration + 5) {
        return { valid: false, ignoreReason: 'oversized_current_time', requestedSeconds: 0 };
      }
    }
  }

  if (body?.playbackRate !== undefined && body?.playbackRate !== null && body?.playbackRate !== '') {
    const playbackRate = Number(body.playbackRate);
    if (!Number.isFinite(playbackRate) || playbackRate <= 0 || playbackRate > 4) {
      return { valid: false, ignoreReason: 'invalid_playback_rate', requestedSeconds: 0 };
    }
  }

  return { valid: true, requestedSeconds: parsedSeconds };
}

/**
 * Membuat penjaga budget watch time per sesi tontonan video.
 * Memisahkan setiap penonton berdasarkan sessionId (atau fallback IP jika tanpa sessionId)
 * sehingga request ganda tertahan tanpa memengaruhi penonton bersamaan lainnya.
 */
export function createWatchSessionGuard() {
  const budgets = new Map<string, WatchSessionEntry>();

  function pruneStaleEntries(nowMs: number): void {
    if (budgets.size <= MAX_TRACKED_SESSIONS) return;
    const staleBefore = nowMs - SESSION_TTL_MS;
    for (const [key, entry] of budgets.entries()) {
      if (entry.lastAtMs < staleBefore) {
        budgets.delete(key);
      }
    }
  }

  function resolveKey(sessionId: unknown, fallbackIp: string | undefined, videoId: number) {
    const cleanSession = typeof sessionId === 'string' ? sessionId.trim().slice(0, 80) : '';
    if (cleanSession.length >= 4) {
      return {
        sessionKey: `sid:${cleanSession}:${videoId}`,
        usedFallbackKey: false,
      };
    }

    const safeIp = typeof fallbackIp === 'string' && fallbackIp.trim() ? fallbackIp.trim().slice(0, 64) : 'local';
    return {
      sessionKey: `anon:${safeIp}:${videoId}`,
      usedFallbackKey: true,
    };
  }

  function claimIncrement(input: ClaimWatchSessionInput): ClaimWatchSessionResult {
    const nowMs = input.nowMs ?? Date.now();
    const roundedRequest = Math.max(Math.round(input.requestedSeconds), 1);
    const clamped = Math.min(roundedRequest, MAX_WATCH_STEP_SECONDS);
    const { sessionKey, usedFallbackKey } = resolveKey(input.sessionId, input.fallbackIp, input.videoId);

    pruneStaleEntries(nowMs);

    const maxInitial = usedFallbackKey ? ANON_INITIAL_CAP_SECONDS : INITIAL_SESSION_CAP_SECONDS;
    const maxBudget = usedFallbackKey ? ANON_MAX_BUDGET_SECONDS : MAX_SESSION_BUDGET_SECONDS;
    const refillMultiplier = usedFallbackKey ? 1.25 : 2;

    const existing = budgets.get(sessionKey);
    if (!existing) {
      const allowedSeconds = Math.min(clamped, maxInitial);
      budgets.set(sessionKey, { lastAtMs: nowMs, budgetSec: 0 });
      return {
        allowedSeconds,
        throttled: allowedSeconds < roundedRequest,
        sessionKey,
        usedFallbackKey,
      };
    }

    const elapsedSec = Math.max(0, (nowMs - existing.lastAtMs) / 1000);
    existing.lastAtMs = nowMs;
    existing.budgetSec = Math.min(maxBudget, existing.budgetSec + elapsedSec * refillMultiplier);

    const allowedSeconds = Math.min(clamped, Math.floor(existing.budgetSec));
    if (allowedSeconds < 1) {
      return {
        allowedSeconds: 0,
        throttled: true,
        sessionKey,
        usedFallbackKey,
      };
    }

    existing.budgetSec -= allowedSeconds;
    return {
      allowedSeconds,
      throttled: allowedSeconds < roundedRequest,
      sessionKey,
      usedFallbackKey,
    };
  }

  return {
    claimIncrement,
    clear: () => budgets.clear(),
    size: () => budgets.size,
  };
}

const defaultWatchSessionGuard = createWatchSessionGuard();

export function claimWatchSessionIncrement(input: ClaimWatchSessionInput): ClaimWatchSessionResult {
  return defaultWatchSessionGuard.claimIncrement(input);
}
