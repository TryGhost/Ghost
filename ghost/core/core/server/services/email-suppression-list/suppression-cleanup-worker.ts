import type {
  SuppressionCleanupRepository,
  SuppressionCleanupRequest,
} from './suppression-cleanup-repository';
import type { SuppressionCleanupClient } from './suppression-cleanup-client';
import { setTimeout as delay } from 'node:timers/promises';

const validator: { isEmail(value: string): boolean } = require('@tryghost/validator');
const { isFQDN }: { isFQDN(value: string): boolean } = require('validator');

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : undefined;
}

function retryHint(value: unknown, limited: boolean): number {
  const state = record(value);
  // MySQL DATETIME cannot persist dates beyond year 9999; discard malformed hints.
  const deadline = (time: unknown) =>
    typeof time === 'number' && Number.isSafeInteger(time) && time > 0 && time <= 253402300799000
      ? time
      : 0;
  return Math.max(
    deadline(state?.retryAt),
    limited || state?.remaining === 0 ? deadline(state?.resetAt) : 0,
  );
}

function parseRequest(payload: string): SuppressionCleanupRequest | null {
  try {
    const value: unknown = JSON.parse(payload);
    if (!value || typeof value !== 'object') {
      return null;
    }
    const data = value as Record<string, unknown>;
    if (
      (data.kind !== 'complaints' && data.kind !== 'unsubscribes') ||
      typeof data.email !== 'string' ||
      data.email.length > 191 ||
      !validator.isEmail(data.email) ||
      typeof data.domain !== 'string' ||
      !isFQDN(data.domain) ||
      typeof data.apiOrigin !== 'string' ||
      new URL(data.apiOrigin).origin !== data.apiOrigin ||
      !['https:', 'http:'].includes(new URL(data.apiOrigin).protocol) ||
      typeof data.eventId !== 'string' ||
      !data.eventId ||
      typeof data.eventTimestamp !== 'string' ||
      !Number.isFinite(Date.parse(data.eventTimestamp))
    ) {
      return null;
    }
    return {
      kind: data.kind,
      email: data.email,
      domain: data.domain,
      apiOrigin: data.apiOrigin,
      eventId: data.eventId,
      eventTimestamp: data.eventTimestamp,
    };
  } catch {
    return null;
  }
}

type RunResult = { completed: number; retrying: number; failed: number };

type Dependencies = {
  repository: Pick<SuppressionCleanupRepository, 'claim' | 'complete' | 'retry' | 'fail'>;
  enabled: () => boolean;
  client: () => Pick<SuppressionCleanupClient, 'remove'> | null;
};

export class SuppressionCleanupWorker {
  readonly #deps: Dependencies;
  readonly #controller = new AbortController();
  #active?: Promise<RunResult>;
  #resumeAt = 0;
  #nextRequestAt = 0;

  constructor(deps: Dependencies) {
    this.#deps = deps;
  }

  run(): Promise<RunResult> {
    if (!this.#active) {
      this.#active = this.#drain().finally(() => {
        this.#active = undefined;
      });
    }
    return this.#active;
  }

  stop(): void {
    this.#controller.abort();
  }

  async shutdown(): Promise<void> {
    this.stop();
    await this.#active;
  }

  async #drain(): Promise<RunResult> {
    const result = { completed: 0, retrying: 0, failed: 0 };
    const startedAt = performance.now();
    const signal = this.#controller.signal;
    for (
      let processed = 0;
      processed < 250 &&
      performance.now() - startedAt < 30000 &&
      this.#deps.enabled() &&
      !signal.aborted;
      processed++
    ) {
      if (Date.now() < this.#resumeAt) {
        return result;
      }
      // Pace before claiming so a provider wait never holds a row lease.
      while (performance.now() < this.#nextRequestAt) {
        const waitMs = Math.ceil(this.#nextRequestAt - performance.now());
        if (performance.now() - startedAt + waitMs >= 30000) {
          return result;
        }
        try {
          await delay(waitMs, undefined, { signal });
        } catch (error) {
          if (signal.aborted) {
            return result;
          }
          throw error;
        }
      }
      if (signal.aborted || !this.#deps.enabled() || performance.now() - startedAt >= 30000) {
        return result;
      }
      const client = this.#deps.client();
      if (!client) {
        return result;
      }
      const claim = await this.#deps.repository.claim();
      if (!claim) {
        return result;
      }
      if (signal.aborted || !this.#deps.enabled() || performance.now() - startedAt >= 30000) {
        result.retrying += Number(
          await this.#deps.repository.retry(
            claim,
            new Date(Math.floor(Date.now() / 1000) * 1000),
            'CANCELED',
          ),
        );
        return result;
      }
      const request = parseRequest(claim.payload);
      if (!request) {
        result.failed += Number(await this.#deps.repository.fail(claim, 'INVALID_PAYLOAD'));
        continue;
      }
      try {
        const outcome = await client.remove(request, signal);
        this.#resumeAt = Math.max(this.#resumeAt, retryHint(outcome.rateLimit, false));
      } catch (error) {
        if (signal.aborted) {
          result.retrying += Number(
            await this.#deps.repository.retry(
              claim,
              new Date(Math.floor(Date.now() / 1000) * 1000),
              'CANCELED',
            ),
          );
          return result;
        }
        const rawStatus = record(error)?.status;
        const status =
          typeof rawStatus === 'number' &&
          Number.isInteger(rawStatus) &&
          rawStatus >= 100 &&
          rawStatus <= 599
            ? rawStatus
            : undefined;
        const code =
          record(error)?.code === 'MAILGUN_SUPPRESSION_ORIGIN_CHANGED'
            ? 'API_ORIGIN_CHANGED'
            : status
              ? `HTTP_${status}`
              : 'TRANSPORT_ERROR';
        const backoff = Math.min(
          3600000,
          30000 * 2 ** Math.min(claim.attempt - 1, 7) * (1 + Math.random() * 0.25),
        );
        const availableAt = Math.max(
          Date.now() + backoff,
          retryHint(record(error)?.rateLimit, status === 429),
        );
        if (status === 429) {
          this.#resumeAt = Math.max(this.#resumeAt, availableAt);
        }
        if (claim.attempt >= 20) {
          result.failed += Number(
            await this.#deps.repository.fail(claim, `RETRY_EXHAUSTED_${code}`),
          );
          continue;
        }
        result.retrying += Number(
          await this.#deps.repository.retry(claim, new Date(availableAt), code),
        );
        continue;
      } finally {
        this.#nextRequestAt = performance.now() + 100;
      }
      result.completed += Number(await this.#deps.repository.complete(claim));
    }
    return result;
  }
}
