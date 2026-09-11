import { InternalServerError } from '@tryghost/errors';

export type MailgunRateLimitState = { remaining?: number; resetAt?: number; retryAt?: number };

export const POLLING_CANCELED = 'MAILGUN_POLLING_CANCELED';
export const RATE_LIMIT_WAIT_EXCEEDED = 'MAILGUN_RATE_LIMIT_WAIT_EXCEEDED';
// Every reader shares one cooldown; a hint far in the future must not park all
// of them until the process restarts.
const MAX_COOLDOWN_MS = 60 * 60 * 1000;
const WAIT_BUDGET_MS = 30 * 1000;
// Readers waking from a shared cooldown must not fire in the same tick.
const RESUME_JITTER_MS = 1000;

/** Keep numeric scheduling hints, never response headers or bodies, on errors. */
export function parseMailgunRateLimit(headers: unknown): MailgunRateLimitState | undefined {
  if (!headers || typeof headers !== 'object' || Array.isArray(headers)) {
    return;
  }
  const values = headers as Record<string, unknown>;
  const integer = (value: unknown): number | undefined => {
    if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+$/.test(value.trim()))) {
      return;
    }
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
  };
  const remaining = integer(values['x-ratelimit-remaining']);
  // Mailgun specifies an absolute Unix timestamp in milliseconds. A value this
  // small can only be seconds; read it rather than silently ignoring the reset.
  // A relative value (seconds until reset) would land in 1970 and contribute no
  // cooldown, which fails safe: Retry-After and the backoff still apply.
  const rawReset = integer(values['x-ratelimit-reset']);
  const resetAt =
    rawReset === undefined ? undefined : rawReset < 100_000_000_000 ? rawReset * 1000 : rawReset;
  const rawRetry = values['retry-after'];
  const seconds = integer(rawRetry);
  const retryTime =
    seconds !== undefined
      ? Date.now() + seconds * 1000
      : typeof rawRetry === 'string'
        ? Date.parse(rawRetry)
        : NaN;
  const retryAt = integer(retryTime);
  const state = {
    ...(remaining !== undefined ? { remaining } : {}),
    ...(resetAt !== undefined ? { resetAt } : {}),
    ...(retryAt !== undefined ? { retryAt } : {}),
  };
  return Object.keys(state).length ? state : undefined;
}

export function canceled(): Error {
  return new InternalServerError({
    message: 'Fetching canceled',
    code: POLLING_CANCELED,
  });
}

export function isCanceled(error: unknown): boolean {
  return (
    error instanceof Error &&
    (('code' in error && error.code === POLLING_CANCELED) || error.message === 'Fetching canceled')
  );
}

/**
 * Whether the provider is throttling beyond what one run may wait for: the
 * cooldown exceeds the wait budget, or a rate-limited read has exhausted its
 * retries (the limiter only rethrows a 429 after retrying it).
 */
export function isThrottled(error: unknown): boolean {
  return (
    (error instanceof Error && 'code' in error && error.code === RATE_LIMIT_WAIT_EXCEEDED) ||
    rateLimited(error)
  );
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      reject(canceled());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', abort, { once: true });
  });
}

function rateLimited(
  error: unknown,
): error is Error & { status: 429; rateLimit?: MailgunRateLimitState } {
  return error instanceof Error && 'status' in error && error.status === 429;
}

/** Back off read-only polling without retrying processor callbacks. */
export class MailgunRateLimit {
  #resumeAt = 0;

  #observe(state: MailgunRateLimitState | undefined, limited: boolean): void {
    const hinted = Math.max(
      state?.retryAt ?? 0,
      limited || state?.remaining === 0 ? (state?.resetAt ?? 0) : 0,
    );
    this.#resumeAt = Math.max(this.#resumeAt, Math.min(hinted, Date.now() + MAX_COOLDOWN_MS));
  }

  async run<T>(
    request: () => Promise<{ value: T; rateLimit?: MailgunRateLimitState }>,
    signal?: AbortSignal,
  ): Promise<T> {
    let retries = 0;
    let waitedMs = 0;
    for (;;) {
      if (signal?.aborted) {
        throw canceled();
      }
      const waitMs = this.#resumeAt - Date.now();
      if (waitMs > 0) {
        if (waitedMs + waitMs > WAIT_BUDGET_MS) {
          throw Object.assign(
            new InternalServerError({
              message: 'Mailgun rate-limit wait exceeds polling budget',
              code: RATE_LIMIT_WAIT_EXCEEDED,
            }),
            { status: 429, retryAt: this.#resumeAt },
          );
        }
        const jitterMs = Math.round(Math.random() * RESUME_JITTER_MS);
        waitedMs += waitMs + jitterMs;
        await wait(waitMs + jitterMs, signal);
        // Another in-flight response can extend the shared cooldown while we wait.
        continue;
      }
      if (signal?.aborted) {
        throw canceled();
      }
      try {
        const result = await request();
        if (signal?.aborted) {
          throw canceled();
        }
        this.#observe(result.rateLimit, false);
        return result.value;
      } catch (error) {
        if (signal?.aborted) {
          throw canceled();
        }
        if (!rateLimited(error)) {
          throw error;
        }
        this.#observe(error.rateLimit, true);
        if (retries === 3) {
          throw error;
        }
        const backoffMs = Math.ceil(1000 * 2 ** retries * (1 + Math.random() * 0.25));
        retries += 1;
        this.#resumeAt = Math.max(this.#resumeAt, Date.now() + backoffMs);
      }
    }
  }
}
