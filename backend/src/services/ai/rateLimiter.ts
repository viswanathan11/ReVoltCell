import { ENV } from '../../config/env';

interface RateLimitRecord {
  timestamps: number[];
}

export class AiRateLimiter {
  private static store = new Map<string, RateLimitRecord>();
  private static cleanupInterval: NodeJS.Timeout | null = null;

  private static initCleanup() {
    if (!this.cleanupInterval) {
      this.cleanupInterval = setInterval(() => {
        const now = Date.now();
        const windowMs = 60 * 1000;
        for (const [key, record] of this.store.entries()) {
          record.timestamps = record.timestamps.filter((t) => now - t < windowMs);
          if (record.timestamps.length === 0) {
            this.store.delete(key);
          }
        }
      }, 60 * 1000);
      // Unref timer so it doesn't prevent graceful shutdown
      if (this.cleanupInterval.unref) {
        this.cleanupInterval.unref();
      }
    }
  }

  /**
   * Checks whether the client has exceeded the allowed requests per minute.
   * @param identifier Client IP or session token
   * @returns true if allowed, false if limit exceeded
   */
  public static checkLimit(identifier: string): { allowed: boolean; remaining: number; resetMs: number } {
    this.initCleanup();

    const now = Date.now();
    const windowMs = 60 * 1000;
    const maxRequests = ENV.AI_RATE_LIMIT_PER_MINUTE;

    let record = this.store.get(identifier);
    if (!record) {
      record = { timestamps: [] };
      this.store.set(identifier, record);
    }

    // Filter to requests within window
    record.timestamps = record.timestamps.filter((t) => now - t < windowMs);

    if (record.timestamps.length >= maxRequests) {
      const oldest = record.timestamps[0];
      const resetMs = Math.max(0, windowMs - (now - oldest));
      return { allowed: false, remaining: 0, resetMs };
    }

    record.timestamps.push(now);
    return {
      allowed: true,
      remaining: maxRequests - record.timestamps.length,
      resetMs: windowMs,
    };
  }

  public static reset() {
    this.store.clear();
  }
}
