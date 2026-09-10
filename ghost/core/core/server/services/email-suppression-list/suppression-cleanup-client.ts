import type { SuppressionCleanupRequest } from './suppression-cleanup-repository';
import { InternalServerError } from '@tryghost/errors';
import {
  parseMailgunRateLimit,
  type MailgunRateLimitState,
} from '../email-analytics/mailgun-rate-limit';

// @tryghost/request has no declarations; isolate its response at this boundary.
const request: (
  url: string,
  options: Record<string, unknown>,
) => Promise<{ statusCode: number; headers?: unknown }> = require('@tryghost/request');
type Target = Pick<SuppressionCleanupRequest, 'apiOrigin' | 'domain' | 'kind' | 'email'>;

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : undefined;
}

function failed(status: number | undefined, rateLimit?: MailgunRateLimitState): Error {
  return Object.assign(
    new InternalServerError({
      message: 'Mailgun suppression cleanup request failed',
      code: 'MAILGUN_SUPPRESSION_REQUEST_FAILED',
    }),
    { status, rateLimit },
  );
}

export class SuppressionCleanupClient {
  readonly #origin: string;
  readonly #apiKey: string;

  constructor({ baseUrl, apiKey }: { baseUrl: string; apiKey: string }) {
    this.#origin = new URL(baseUrl).origin;
    this.#apiKey = apiKey;
  }

  async remove(
    target: Target,
    signal?: AbortSignal,
  ): Promise<{ status: 'removed' | 'absent'; rateLimit?: MailgunRateLimitState }> {
    if (target.apiOrigin !== this.#origin) {
      throw new InternalServerError({
        message: 'Mailgun suppression cleanup API origin changed',
        code: 'MAILGUN_SUPPRESSION_ORIGIN_CHANGED',
      });
    }
    let response: Awaited<ReturnType<typeof request>>;
    try {
      response = await request(
        `${this.#origin}/v3/${encodeURIComponent(target.domain)}/${target.kind}/${encodeURIComponent(target.email)}`,
        {
          method: 'DELETE',
          username: 'api',
          password: this.#apiKey,
          signal,
          followRedirect: false,
          retry: { limit: 0 },
          timeout: { request: 10000 },
        },
      );
    } catch (error) {
      const failedResponse = record(record(error)?.response);
      const statusCode = failedResponse?.statusCode ?? record(error)?.statusCode;
      const status =
        typeof statusCode === 'number' &&
        Number.isInteger(statusCode) &&
        statusCode >= 100 &&
        statusCode <= 599
          ? statusCode
          : undefined;
      const rateLimit = parseMailgunRateLimit(failedResponse?.headers ?? record(error)?.headers);
      if (status === 404) {
        return { status: 'absent', rateLimit };
      }
      // Transport errors retain credentials, recipient addresses and response bodies.
      throw failed(status, rateLimit);
    }
    const rateLimit = parseMailgunRateLimit(response.headers);
    // Got resolves 3xx when redirects are disabled; that is not a confirmed deletion.
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw failed(response.statusCode, rateLimit);
    }
    return { status: 'removed', rateLimit };
  }
}
