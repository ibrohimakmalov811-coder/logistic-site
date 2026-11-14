import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { env } from "@/env";

export type RateLimitScope =
  | "waitlist"
  | "auth_login"
  | "auth_signup"
  | "auth_reset"
  | "invite_redeem"
  | "mfa_verify"
  | "portal_mutation";

const SCOPE_CONFIG: Record<
  RateLimitScope,
  { maxRequests: number; windowMs: number; upstashWindow: "1 m" | "10 m" | "15 m" | "1 h" }
> = {
  waitlist: { maxRequests: 5, windowMs: 10 * 60 * 1000, upstashWindow: "10 m" },
  auth_login: { maxRequests: 8, windowMs: 15 * 60 * 1000, upstashWindow: "15 m" },
  auth_signup: { maxRequests: 5, windowMs: 15 * 60 * 1000, upstashWindow: "15 m" },
  auth_reset: { maxRequests: 4, windowMs: 15 * 60 * 1000, upstashWindow: "15 m" },
  invite_redeem: { maxRequests: 6, windowMs: 15 * 60 * 1000, upstashWindow: "15 m" },
  mfa_verify: { maxRequests: 8, windowMs: 10 * 60 * 1000, upstashWindow: "10 m" },
  portal_mutation: { maxRequests: 60, windowMs: 60 * 1000, upstashWindow: "1 m" },
};

/**
 * In-memory fallback rate limiter for LOCAL DEVELOPMENT ONLY.
 * MUST NEVER BE USED IN PRODUCTION.
 */
class InMemoryRateLimiter {
  private cache = new Map<string, { count: number; expiresAt: number }>();

  async limit(identifier: string, scope: RateLimitScope) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "FATAL: In-memory rate limiter cannot be used in production. Configure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."
      );
    }

    const cfg = SCOPE_CONFIG[scope];
    const key = `${scope}:${identifier}`;
    const now = Date.now();
    const record = this.cache.get(key);

    if (!record || now > record.expiresAt) {
      this.cache.set(key, { count: 1, expiresAt: now + cfg.windowMs });
      return {
        success: true,
        limit: cfg.maxRequests,
        remaining: cfg.maxRequests - 1,
        reset: now + cfg.windowMs,
      };
    }

    if (record.count >= cfg.maxRequests) {
      return {
        success: false,
        limit: cfg.maxRequests,
        remaining: 0,
        reset: record.expiresAt,
      };
    }

    record.count += 1;
    return {
      success: true,
      limit: cfg.maxRequests,
      remaining: cfg.maxRequests - record.count,
      reset: record.expiresAt,
    };
  }
}

const memoryLimiter = new InMemoryRateLimiter();

/**
 * Checks rate limits per identifier and security scope.
 * Uses Upstash Redis when configured; falls back to in-memory only in development.
 */
export async function checkRateLimit(
  identifier: string,
  scope: RateLimitScope = "waitlist"
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  const isUpstashConfigured =
    Boolean(env.UPSTASH_REDIS_REST_URL) && Boolean(env.UPSTASH_REDIS_REST_TOKEN);

  if (!isUpstashConfigured) {
    if (env.NODE_ENV === "production") {
      console.error(
        "[SECURITY ALERT] Upstash Redis credentials missing in production! Rejecting request to prevent abuse."
      );
      return { success: false, limit: 0, remaining: 0, reset: Date.now() + 60000 };
    }
    return memoryLimiter.limit(identifier, scope);
  }

  try {
    const cfg = SCOPE_CONFIG[scope];
    const redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL!,
      token: env.UPSTASH_REDIS_REST_TOKEN!,
    });

    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(cfg.maxRequests, cfg.upstashWindow),
      analytics: true,
      prefix: `logistika_${scope}_limit`,
    });

    const result = await ratelimit.limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    console.error("[RateLimit Error] Failed to contact Upstash Redis:", error);
    if (env.NODE_ENV === "production") {
      return { success: false, limit: 0, remaining: 0, reset: Date.now() + 60000 };
    }
    return memoryLimiter.limit(identifier, scope);
  }
}
