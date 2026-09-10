import { InternalServerError } from '@tryghost/errors';

// @tryghost/request has no type declarations. Keep its untrusted response at the boundary.
const request: (
  url: string,
  options: Record<string, unknown>,
) => Promise<{ body: unknown }> = require('@tryghost/request');

type LogPageOptions = {
  domain: string;
  tags: string[];
  events: string[];
  begin: Date;
  end: Date;
  token?: string;
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

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function rfc2822(time: number): string {
  return `${new Date(time).toUTCString().slice(0, 25)} -0000`;
}

function equality(attribute: string, value: string) {
  return { attribute, comparator: '=', values: [{ label: value, value }] };
}

/** Logs pages use opaque tokens and the same normalized event shape as Events. */
export class MailgunLogsClient {
  readonly #url: string;
  readonly #apiKey: string;

  constructor({ baseUrl, apiKey }: { baseUrl: string; apiKey: string }) {
    this.#url = new URL('/v1/analytics/logs', new URL(baseUrl).origin).href;
    this.#apiKey = apiKey;
  }

  async getPage(
    options: LogPageOptions,
  ): Promise<{ items: MailgunAnalyticsEvent[]; next?: string; empty: boolean }> {
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
    try {
      const response = await request(this.#url, {
        method: 'POST',
        username: 'api',
        password: this.#apiKey,
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
    } catch (error) {
      // The request wrapper copies credentials/options onto transport errors.
      // Never attach or rethrow that error into analytics logging.
      const statusCode = record(record(error)?.response)?.statusCode ?? record(error)?.statusCode;
      const status =
        typeof statusCode === 'number' &&
        Number.isInteger(statusCode) &&
        statusCode >= 100 &&
        statusCode <= 599
          ? statusCode
          : undefined;
      throw Object.assign(
        new InternalServerError({
          message: 'Mailgun Logs request failed',
          code: 'MAILGUN_LOGS_REQUEST_FAILED',
        }),
        { status },
      );
    }
    const page = record(body);
    const pagination = record(page?.pagination);
    if (
      !page ||
      !Array.isArray(page.items) ||
      !pagination ||
      (pagination.next !== undefined &&
        pagination.next !== null &&
        typeof pagination.next !== 'string')
    ) {
      throw new InternalServerError({ message: 'Invalid Mailgun Logs page' });
    }
    const items = page.items
      .filter((value) => {
        const item = record(value);
        const domain = record(item?.domain)?.name;
        const tags = item?.tags;
        if (
          !item ||
          typeof domain !== 'string' ||
          !Array.isArray(tags) ||
          !tags.every((tag) => typeof tag === 'string') ||
          typeof item.event !== 'string'
        ) {
          throw new InternalServerError({ message: 'Invalid Mailgun Logs event provenance' });
        }
        return (
          domain === options.domain &&
          options.tags.every((tag) => tags.includes(tag)) &&
          options.events.includes(item.event)
        );
      })
      .map((item) => this.#normalize(item))
      .filter(
        (item): item is MailgunAnalyticsEvent =>
          item !== undefined && item.timestamp >= options.begin && item.timestamp <= options.end,
      );
    const next = pagination.next;
    return {
      items,
      next: typeof next === 'string' ? next : undefined,
      empty: page.items.length === 0,
    };
  }

  #normalize(value: unknown): MailgunAnalyticsEvent | undefined {
    const item = record(value);
    if (!item) {
      throw new InternalServerError({ message: 'Invalid Mailgun Logs event' });
    }
    const headers = record(record(item.message)?.headers);
    const providerId =
      typeof headers?.['message-id'] === 'string' ? headers['message-id'] : undefined;
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
    const timestamp = new Date(typeof item['@timestamp'] === 'string' ? item['@timestamp'] : NaN);
    if (
      !Number.isFinite(timestamp.getTime()) ||
      typeof item.id !== 'string' ||
      typeof item.event !== 'string'
    ) {
      throw new InternalServerError({
        message: 'Invalid Mailgun Logs event identity or timestamp',
      });
    }
    const delivery = record(item['delivery-status']);
    const message = delivery?.message || delivery?.description;
    const enhanced = delivery?.['enhanced-code'];
    return {
      id: item.id,
      type: item.event,
      recipientEmail: item.recipient,
      emailId,
      providerId,
      timestamp,
      severity: typeof item.severity === 'string' ? item.severity : undefined,
      error:
        typeof message === 'string'
          ? {
              code:
                typeof delivery?.code === 'string' || typeof delivery?.code === 'number'
                  ? delivery.code
                  : undefined,
              message: message.substring(0, 2000),
              enhancedCode:
                typeof enhanced === 'string' || typeof enhanced === 'number'
                  ? String(enhanced).substring(0, 50)
                  : null,
            }
          : null,
    };
  }
}
