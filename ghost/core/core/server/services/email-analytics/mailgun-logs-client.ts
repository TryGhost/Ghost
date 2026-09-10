import { IncorrectUsageError, InternalServerError } from '@tryghost/errors';
import logging from '@tryghost/logging';
import metrics from '@tryghost/metrics';
import { z } from 'zod';
import { parseMailgunRateLimit, type MailgunRateLimitState } from './mailgun-rate-limit';

// @tryghost/request has no type declarations. Keep its untrusted response at the boundary.
const request: (
  url: string,
  options: Record<string, unknown>,
) => Promise<{
  body: unknown;
  statusCode?: unknown;
  headers?: unknown;
}> = require('@tryghost/request');

type LogPageOptions = {
  domain: string;
  tags: string[];
  events: string[];
  begin: Date;
  end: Date;
  token?: string;
  signal?: AbortSignal;
};

export type MailgunAnalyticsEvent = {
  id: string;
  type: string;
  recipientEmail: string;
  emailId?: string;
  providerId?: string;
  timestamp: Date;
  severity?: string;
  error: { code?: number | string; message: string; enhancedCode: string | null } | null;
};

export type MailgunLogsPage = {
  /** Normalized events for the requested domain, tags, types and window. */
  items: MailgunAnalyticsEvent[];
  next?: string;
  /** Records the provider returned before filtering, including unreadable ones. */
  rawCount: number;
  /** Provider records that could not be read and were skipped. */
  skipped: number;
  /** Latest timestamp among readable provider records, filtered or not. */
  lastTimestamp?: Date;
  /** Quota hints from the response headers, when the provider sent any. */
  rateLimit?: MailgunRateLimitState;
};

// Boundary data: the provider owns these shapes, so read only what ingestion
// needs and tolerate extra fields. Records that do not fit are skipped, never
// fatal: one unreadable line must not stall every lane's cursor.
const LogsPage = z.object({
  items: z.array(z.unknown()),
  pagination: z.object({ next: z.string().nullish() }).passthrough(),
});
const codeValue = z.union([z.string(), z.number()]);
const LogsItem = z.object({
  id: z.string(),
  event: z.string(),
  '@timestamp': z.string(),
  recipient: z.string().optional(),
  severity: z.string().optional(),
  domain: z.object({ name: z.string() }).passthrough(),
  tags: z.array(z.string()).nullish(),
  'user-variables': z.unknown().optional(),
  message: z
    .object({ headers: z.object({ 'message-id': z.string().optional() }).passthrough().nullish() })
    .passthrough()
    .nullish(),
  'delivery-status': z
    .object({
      code: codeValue.optional(),
      message: z.string().optional(),
      description: z.string().optional(),
      'enhanced-code': codeValue.optional(),
    })
    .passthrough()
    .nullish(),
});
type LogsItem = z.output<typeof LogsItem>;

// Plain property access rather than a Zod record: transport errors are class
// instances, which Zod rejects, and only their own fields are read here.
function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/** Only a plausible HTTP status reaches metrics; anything else is unknown. */
function httpStatus(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599
    ? value
    : undefined;
}

function rfc2822(time: number): string {
  return `${new Date(time).toUTCString().slice(0, 25)} -0000`;
}

function equality(attribute: string, value: string) {
  return { attribute, comparator: '=', values: [{ label: value, value }] };
}

/**
 * The Events base URL points at `/v3` on the regional host, possibly behind a
 * proxy prefix. Logs live under `/v1/analytics/logs` on the same host and prefix.
 */
export function resolveLogsUrl(baseUrl: string): string {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new IncorrectUsageError({ message: 'Mailgun base URL is not a valid absolute URL' });
  }
  const prefix = url.pathname.replace(/\/+$/, '').replace(/\/v3$/, '');
  url.pathname = `${prefix}/v1/analytics/logs`;
  url.search = '';
  url.hash = '';
  return url.href;
}

/** Logs pages use opaque tokens and the same normalized event shape as Events. */
export class MailgunLogsClient {
  readonly #url: string;
  readonly #apiKey: string;

  constructor({ baseUrl, apiKey }: { baseUrl: string; apiKey: string }) {
    this.#url = resolveLogsUrl(baseUrl);
    this.#apiKey = apiKey;
  }

  async getPage(options: LogPageOptions): Promise<MailgunLogsPage> {
    if (
      !options.domain.trim() ||
      options.tags.length === 0 ||
      options.tags.some((tag) => !tag.trim()) ||
      options.events.length === 0 ||
      options.events.some((event) => !event.trim()) ||
      !Number.isFinite(options.begin.getTime()) ||
      !Number.isFinite(options.end.getTime()) ||
      options.begin > options.end
    ) {
      throw new InternalServerError({
        message: 'Invalid Mailgun Logs request filters or time window',
      });
    }
    let body: unknown;
    let rateLimit: MailgunRateLimitState | undefined;
    const startedAt = Date.now();
    try {
      const response = await request(this.#url, {
        method: 'POST',
        username: 'api',
        password: this.#apiKey,
        signal: options.signal,
        responseType: 'json',
        followRedirect: false,
        retry: { limit: 0 },
        timeout: { request: 60000 },
        json: {
          start: rfc2822(Math.floor(options.begin.getTime() / 1000) * 1000),
          end: rfc2822(Math.ceil(options.end.getTime() / 1000) * 1000),
          events: options.events,
          include_subaccounts: false,
          include_totals: false,
          filter: {
            AND: [
              equality('domain', options.domain),
              ...options.tags.map((tag) => equality('tag', tag)),
            ],
          },
          pagination: {
            sort: 'timestamp:asc',
            limit: 100,
            ...(options.token ? { token: options.token } : {}),
          },
        },
      });
      body = response.body;
      rateLimit = parseMailgunRateLimit(response.headers);
      metrics.metric('mailgun-get-events', {
        value: Date.now() - startedAt,
        statusCode: httpStatus(response.statusCode) ?? 200,
        source: 'logs',
      });
    } catch (error) {
      // The request wrapper copies credentials/options onto transport errors.
      // Never attach or rethrow that error into analytics logging.
      const status = httpStatus(
        record(record(error)?.response)?.statusCode ?? record(error)?.statusCode,
      );
      rateLimit = parseMailgunRateLimit(
        record(record(error)?.response)?.headers ?? record(error)?.headers,
      );
      metrics.metric('mailgun-get-events', {
        value: Date.now() - startedAt,
        statusCode: status,
        source: 'logs',
      });
      const rejected = status === 401 || status === 403;
      throw Object.assign(
        new InternalServerError({
          message: rejected
            ? `Mailgun Logs request was rejected (status ${status}): the configured API key must be able to read account logs, which a domain sending key cannot`
            : `Mailgun Logs request failed${status ? ` (status ${status})` : ''}`,
          context: `Sending domain ${options.domain}`,
          code: rejected ? 'MAILGUN_LOGS_REQUEST_REJECTED' : 'MAILGUN_LOGS_REQUEST_FAILED',
        }),
        { status, ...(rateLimit ? { rateLimit } : {}) },
      );
    }
    const page = LogsPage.safeParse(body);
    if (!page.success) {
      throw new InternalServerError({
        message: 'Invalid Mailgun Logs page',
        context: `Sending domain ${options.domain}`,
      });
    }
    const items: MailgunAnalyticsEvent[] = [];
    let skipped = 0;
    let lastTimestamp: Date | undefined;
    for (const value of page.data.items) {
      const item = LogsItem.safeParse(value);
      const timestamp = item.success ? new Date(item.data['@timestamp']) : new Date(NaN);
      if (!item.success || !Number.isFinite(timestamp.getTime())) {
        skipped += 1;
        continue;
      }
      // The request end is rounded up to a whole second, so a record can sit
      // just past the window; it must not count as covered.
      if (timestamp > options.end) {
        continue;
      }
      if (!lastTimestamp || timestamp > lastTimestamp) {
        lastTimestamp = timestamp;
      }
      const tags = item.data.tags ?? [];
      if (
        item.data.domain.name !== options.domain ||
        !options.tags.every((tag) => tags.includes(tag)) ||
        !options.events.includes(item.data.event) ||
        timestamp < options.begin
      ) {
        continue;
      }
      const normalized = this.#normalize(item.data, timestamp);
      if (normalized) {
        items.push(normalized);
      } else {
        // A matching record without a recipient or any email identity cannot be
        // attributed; count it so a provider change does not fail silently.
        skipped += 1;
      }
    }
    if (skipped) {
      logging.warn(
        `[MailgunLogsClient] Skipped ${skipped} unreadable or unattributable Mailgun Logs record(s) for domain ${options.domain}`,
      );
    }
    return {
      items,
      next: page.data.pagination.next ?? undefined,
      rawCount: page.data.items.length,
      skipped,
      lastTimestamp,
      ...(rateLimit ? { rateLimit } : {}),
    };
  }

  #normalize(item: LogsItem, timestamp: Date): MailgunAnalyticsEvent | undefined {
    const providerId = item.message?.headers?.['message-id'];
    const rawVariables = item['user-variables'];
    let variables: Record<string, unknown> | undefined;
    try {
      variables = record(
        typeof rawVariables === 'string' ? JSON.parse(rawVariables) : rawVariables,
      );
    } catch {
      variables = undefined;
    }
    const emailId = typeof variables?.['email-id'] === 'string' ? variables['email-id'] : undefined;
    if ((!providerId && !emailId) || typeof item.recipient !== 'string') {
      return undefined;
    }
    const delivery = item['delivery-status'];
    const message = delivery?.message || delivery?.description;
    const enhanced = delivery?.['enhanced-code'];
    return {
      id: item.id,
      type: item.event,
      recipientEmail: item.recipient,
      emailId,
      providerId,
      timestamp,
      severity: item.severity,
      error:
        typeof message === 'string'
          ? {
              code: delivery?.code,
              message: message.substring(0, 2000),
              enhancedCode: enhanced !== undefined ? String(enhanced).substring(0, 50) : null,
            }
          : null,
    };
  }
}
