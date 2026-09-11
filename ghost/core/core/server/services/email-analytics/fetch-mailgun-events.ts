// @ts-expect-error This module lacks type definitions.
import MailgunClient from '../lib/mailgun-client';
import { fetchMailgunLogs } from './fetch-mailgun-logs';
import { IncorrectUsageError } from '@tryghost/errors';
import type { MailgunRateLimit } from './mailgun-rate-limit';

const DEFAULT_EVENT_FILTER = 'delivered OR opened OR failed OR unsubscribed OR complained';
const PAGE_LIMIT = 300;

type FetchMailgunEventsOptions = {
  config: { get: (key: string) => unknown };
  settings: { get: (key: string) => unknown };
  tags: string[];
  batchHandler: Function;
  /** Per-domain soft maximum. We stop fetching a domain after we reached the maximum AND received at least one event after begin (not equal) to prevent deadlocks. */
  maxEvents?: number;
  begin?: Date;
  end?: Date;
  events?: string[];
  rateLimiter?: MailgunRateLimit;
  signal?: AbortSignal;
};

/**
 * Fetch Mailgun email analytics events.
 */
export async function fetchMailgunEvents({
  config,
  settings,
  tags,
  batchHandler,
  maxEvents,
  begin,
  end,
  events,
  rateLimiter,
  signal,
}: FetchMailgunEventsOptions) {
  const source = config.get('emailAnalytics:fetchSource') ?? 'events';
  if (source !== 'events' && source !== 'logs') {
    throw new IncorrectUsageError({
      message: 'Invalid emailAnalytics.fetchSource; expected events or logs',
    });
  }
  if (source === 'logs') {
    return fetchMailgunLogs({
      config,
      settings,
      tags,
      events: events ?? DEFAULT_EVENT_FILTER.split(' OR '),
      begin,
      end,
      maxEvents,
      rateLimiter,
      signal,
      batchHandler: (page) => batchHandler(page),
    });
  }
  const mailgunClient = new MailgunClient({ config, settings });
  const mailgunOptions = {
    limit: PAGE_LIMIT,
    event: events ? events.join(' OR ') : DEFAULT_EVENT_FILTER,
    tags: tags.join(' AND '),
    begin: begin ? begin.getTime() / 1000 : undefined,
    end: end ? end.getTime() / 1000 : undefined,
    ascending: 'yes',
  };
  return await mailgunClient.fetchEvents(mailgunOptions, batchHandler, { maxEvents });
}
