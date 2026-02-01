type RateLimitState = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitState>();

const now = () => Date.now();
const SWEEP_THRESHOLD = 1_000;

const sweepExpiredEntries = (current: number) => {
  if (rateLimitStore.size < SWEEP_THRESHOLD) {
    return;
  }

  for (const [key, value] of rateLimitStore.entries()) {
    if (current >= value.resetAt) {
      rateLimitStore.delete(key);
    }
  }
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

export const checkRateLimit = (
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult => {
  const current = now();
  sweepExpiredEntries(current);
  const existing = rateLimitStore.get(key);

  if (!existing || current >= existing.resetAt) {
    if (existing) {
      rateLimitStore.delete(key);
    }
    const resetAt = current + windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      resetAt,
    };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }

  const updatedCount = existing.count + 1;
  rateLimitStore.set(key, { count: updatedCount, resetAt: existing.resetAt });

  return {
    allowed: true,
    remaining: Math.max(0, limit - updatedCount),
    resetAt: existing.resetAt,
  };
};
