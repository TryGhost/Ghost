import logging from '@tryghost/logging';
import { InternalServerError } from '@tryghost/errors';
import { getMailgunConfig, getMailgunDomains, type ConfigReader } from '../lib/mailgun-config';
import { MailgunLogsClient, type MailgunAnalyticsEvent } from './mailgun-logs-client';
import { MailgunRateLimit } from './mailgun-rate-limit';

type Page = Awaited<ReturnType<MailgunLogsClient['getPage']>>;
type PageOutcome = { ok: true; page: Page } | { ok: false; error: unknown };

export async function fetchMailgunLogs({
  config,
  settings,
  tags,
  events,
  begin,
  end,
  batchHandler,
  maxEvents = Infinity,
  rateLimiter = new MailgunRateLimit(),
  signal,
}: {
  config: ConfigReader;
  settings: ConfigReader;
  tags: string[];
  events: string[];
  begin?: Date;
  end?: Date;
  maxEvents?: number;
  rateLimiter?: MailgunRateLimit;
  signal?: AbortSignal;
  batchHandler: (events: MailgunAnalyticsEvent[]) => Promise<void> | void;
}): Promise<{ safeCursor?: Date } | void> {
  const mailgun = getMailgunConfig(config, settings);
  if (!mailgun) {
    logging.warn('Mailgun is not configured');
    return;
  }
  const client = new MailgunLogsClient(mailgun);
  const readPage = (options: Parameters<MailgunLogsClient['getPage']>[0]) =>
    rateLimiter.run(async () => {
      const page = await client.getPage(options);
      return { value: page, rateLimit: page.rateLimit };
    }, options.signal);
  const prefetch = config.get('emailAnalytics:fetchPrefetch') === true;
  // Fix the provider window at fetch start so long runs retain the sliding retry overlap.
  const windowEnd = new Date(Math.min(end?.getTime() ?? Infinity, Date.now()));
  const windowBegin = begin ?? new Date(windowEnd.getTime() - 24 * 60 * 60 * 1000);
  let safeCursor: Date | undefined;
  // Keep callbacks serial: all domains share the active lane's processor state.
  for (const domain of getMailgunDomains(config, mailgun.domain)) {
    let token: string | undefined;
    const seenTokens = new Set<string>();
    let eventCount = 0;
    let pending: Promise<PageOutcome> | undefined;
    const controller = new AbortController();
    const readSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
    try {
      do {
        const options = {
          domain,
          tags,
          events,
          begin: windowBegin,
          end: windowEnd,
          token,
          signal: readSignal,
        };
        let page: Page;
        if (pending) {
          const result = await pending;
          pending = undefined;
          if (!result.ok) {
            throw result.error;
          }
          page = result.page;
        } else {
          page = await readPage(options);
        }
        if (readSignal.aborted) {
          throw new InternalServerError({
            message: 'Fetching canceled',
            code: 'MAILGUN_POLLING_CANCELED',
          });
        }
        if (!page.empty && page.next) {
          if (seenTokens.has(page.next)) {
            throw new InternalServerError({ message: 'Invalid Mailgun Logs pagination' });
          }
          seenTokens.add(page.next);
        }
        const last = page.items[page.items.length - 1]?.timestamp;
        const capped = eventCount + page.items.length >= maxEvents && !!last && last > windowBegin;
        const next = page.empty ? undefined : page.next;
        if (prefetch && next && !capped) {
          // Attach both outcomes immediately: a fast failure must not become an unhandled rejection
          // while the current page is still being processed.
          pending = readPage({ ...options, token: next }).then(
            (nextPage) => ({ ok: true, page: nextPage }),
            (error) => ({ ok: false, error }),
          );
        }
        if (page.items.length) {
          await batchHandler(page.items);
          if (readSignal.aborted) {
            throw new InternalServerError({
              message: 'Fetching canceled',
              code: 'MAILGUN_POLLING_CANCELED',
            });
          }
          eventCount += page.items.length;
          // Re-cover the boundary on the next fetch, but finish begin-time ties to make progress.
          if (capped && last) {
            if (!safeCursor || last < safeCursor) {
              safeCursor = last;
            }
            break;
          }
        }
        token = next;
      } while (token);
    } finally {
      if (pending) {
        // A callback can fail while the next request is running. Stop and settle it
        // before returning so no detached request survives the failed fetch.
        controller.abort();
        await pending;
      }
    }
  }
  return { safeCursor };
}
