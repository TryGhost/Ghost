import type { BetterAuthRateLimitOptions } from 'better-auth';

type RateLimitStorage = NonNullable<BetterAuthRateLimitOptions['customStorage']>;

/** The part of Ghost's `BackoffLimiter` Better Auth's limiter runs on. */
export type Limiter = {
  consume(key: {
    ip?: string;
    key?: string;
  }): Promise<{ allowed: true } | { allowed: false; retryAfterMs: number }>;
  reset(key: { ip?: string; key?: string }): Promise<void>;
};

/** Ghost's `spam` limiters, looked up per request so a reset rebuilds them. */
export type Limiters = Record<
  'globalBlock' | 'globalReset' | 'userLogin' | 'userReset',
  () => Limiter
>;

type LimiterName = keyof Limiters;

const SESSION = '/session/';
const PASSWORD_RESET = '/authentication/password_reset/';

// Each native credential route counts against its compatibility route's limiters
const ROUTE_LIMITERS: Record<string, { route: string; limiters: LimiterName[] }> = {
  // POST /session
  '/sign-in/email': { route: SESSION, limiters: ['globalBlock', 'userLogin'] },
  // Sends an email per request, like POST /authentication/password_reset
  '/sign-in/magic-link': { route: PASSWORD_RESET, limiters: ['globalReset', 'userReset'] },
  // POST /authentication/password_reset
  '/request-password-reset': { route: PASSWORD_RESET, limiters: ['globalReset', 'userReset'] },
  // PUT /authentication/password_reset
  '/reset-password': { route: PASSWORD_RESET, limiters: ['globalBlock'] },
  // Check the current password; PUT /users/password has no limit, so these get their own
  '/change-password': { route: '/change-password', limiters: ['globalBlock'] },
  '/verify-password': { route: '/verify-password', limiters: ['globalBlock'] },
};

// Their Express middleware keys these on `req.path`, as Admin calls it
const PATH_KEYED = new Set<LimiterName>(['globalBlock', 'globalReset']);

/**
 * Better Auth rate-limit storage over Ghost's limiters. Their own `spam`
 * settings apply, so Better Auth's window and max are ignored, and paths
 * that take no credential are not limited.
 */
export function rateLimitStorage(limiters: Limiters): RateLimitStorage {
  return {
    async consume(rateLimitKey) {
      // Better Auth's key is `${ip}|${path}`; neither part contains `|`
      const [ip, path = ''] = rateLimitKey.split('|');
      const mapped = ROUTE_LIMITERS[path];
      if (!mapped) {
        return { allowed: true, retryAfter: null };
      }

      // In order, so a blocked request stops before the next limiter counts it
      for (const name of mapped.limiters) {
        const result = await limiters[name]().consume({
          ip,
          key: PATH_KEYED.has(name) ? mapped.route : undefined,
        });
        if (!result.allowed) {
          return { allowed: false, retryAfter: Math.ceil(result.retryAfterMs / 1000) };
        }
      }

      return { allowed: true, retryAfter: null };
    },
  };
}
