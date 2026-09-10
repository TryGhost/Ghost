import { InternalServerError } from '@tryghost/errors';

export type MailgunRateLimitState = { remaining?: number; resetAt?: number; retryAt?: number };

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
  // Mailgun specifies an absolute Unix timestamp in milliseconds, not seconds.
  const resetAt = integer(values['x-ratelimit-reset']);
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

function canceled(): Error {
  return new InternalServerError({
    message: 'Fetching canceled',
    code: 'MAILGUN_POLLING_CANCELED',
  });
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
    this.#resumeAt = Math.max(
      this.#resumeAt,
      state?.retryAt ?? 0,
      limited || state?.remaining === 0 ? (state?.resetAt ?? 0) : 0,
    );
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
        if (waitedMs + waitMs > 30000) {
          throw Object.assign(
            new InternalServerError({
              message: 'Mailgun rate-limit wait exceeds polling budget',
              code: 'MAILGUN_RATE_LIMIT_WAIT_EXCEEDED',
            }),
            { status: 429, retryAt: this.#resumeAt },
          );
        }
        waitedMs += waitMs;
        await wait(waitMs, signal);
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
