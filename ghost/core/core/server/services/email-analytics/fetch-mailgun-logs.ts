import logging from '@tryghost/logging';
import { getMailgunConfig, getMailgunDomains, type ConfigReader } from '../lib/mailgun-config';
import { MailgunLogsClient, type MailgunAnalyticsEvent } from './mailgun-logs-client';
import { MailgunRateLimit } from './mailgun-rate-limit';

// A domain whose pages keep paging without matching events still bounds its
// work: raw records count toward the budget, and pages are capped outright.
const MAX_PAGES_PER_DOMAIN = 1000;

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
}: {
  config: ConfigReader;
  settings: ConfigReader;
  tags: string[];
  events: string[];
  begin?: Date;
  end?: Date;
  maxEvents?: number;
  batchHandler: (events: MailgunAnalyticsEvent[]) => Promise<void> | void;
}): Promise<{ safeCursor?: Date } | void> {
  const mailgun = getMailgunConfig(config, settings);
  if (!mailgun) {
    logging.warn('Mailgun is not configured');
    return;
  }
  const client = new MailgunLogsClient(mailgun);
  const limiter = new MailgunRateLimit();
  const readPage = (options: Parameters<MailgunLogsClient['getPage']>[0]) =>
    limiter.run(async () => {
      const page = await client.getPage(options);
      return { value: page, rateLimit: page.rateLimit };
    }, options.signal);
  const prefetch = config.get('emailAnalytics:fetchPrefetch') === true;
  // Fix the provider window at fetch start so long runs retain the sliding retry overlap.
  const windowEnd = new Date(Math.min(end?.getTime() ?? Infinity, Date.now()));
  const windowBegin = begin ?? new Date(windowEnd.getTime() - 24 * 60 * 60 * 1000);
  let safeCursor: Date | undefined;
  const cap = (at: Date) => {
    if (!safeCursor || at < safeCursor) {
      safeCursor = at;
    }
  };
  // Keep callbacks serial: all domains share the active lane's processor state.
  for (const domain of getMailgunDomains(config, mailgun.domain)) {
    const prefix = `[MailgunLogs fetch ${domain}]`;
    let token: string | undefined;
    const seenTokens = new Set<string>();
    let eventCount = 0;
    let rawCount = 0;
    let skipped = 0;
    let pages = 0;
    let status = 'exhausted';
    // Everything the provider returned up to this timestamp was either
    // processed or irrelevant, so a capped cursor may safely rest here.
    let covered: Date | undefined;
    let pending: Promise<PageOutcome> | undefined;
    const controller = new AbortController();
    try {
      do {
        const options = {
          domain,
          tags,
          events,
          begin: windowBegin,
          end: windowEnd,
          token,
          signal: controller.signal,
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
        pages += 1;
        rawCount += page.rawCount;
        skipped += page.skipped;
        if (page.lastTimestamp && (!covered || page.lastTimestamp > covered)) {
          covered = page.lastTimestamp;
        }
        // Decide before delivery whether this domain continues, so the next
        // page can be requested while this one is processed. The cursor is
        // re-covered on the next fetch, but begin-time ties are finished to
        // make progress.
        const budgetSpent = eventCount + page.items.length >= maxEvents || rawCount >= maxEvents;
        let stop: 'capped' | 'exhausted' | 'pages' | 'repeated' | undefined;
        if (budgetSpent && covered && covered > windowBegin) {
          stop = 'capped';
        } else if (!page.next) {
          stop = 'exhausted';
        } else if (seenTokens.has(page.next)) {
          // A provider that echoes the last token has nothing more; one that
          // repeats an earlier token must not skip anything. This page is still
          // delivered, then the cursor rests on what the domain covered so far.
          stop = 'repeated';
        } else if (pages >= MAX_PAGES_PER_DOMAIN) {
          stop = 'pages';
        }
        if (prefetch && !stop) {
          // Attach both outcomes immediately: a fast failure must not become an
          // unhandled rejection while the current page is still being processed.
          pending = readPage({ ...options, token: page.next }).then(
            (nextPage) => ({ ok: true, page: nextPage }),
            (error) => ({ ok: false, error }),
          );
        }
        if (page.items.length) {
          await batchHandler(page.items);
          eventCount += page.items.length;
        }
        if (stop === 'capped' && covered) {
          cap(covered);
          status = 'capped';
          break;
        }
        if (stop === 'exhausted' || !page.next) {
          break;
        }
        seenTokens.add(page.next);
        if (stop === 'pages' || stop === 'repeated') {
          logging.warn(
            stop === 'pages'
              ? `${prefix}: stopped after ${pages} pages`
              : `${prefix}: repeated pagination token after ${pages} pages`,
          );
          if (covered && covered > windowBegin) {
            cap(covered);
            status = 'capped';
          }
          break;
        }
        // An empty page can still carry a token; the page and record budgets
        // bound how far a domain keeps paging without matching events.
        token = page.next;
      } while (token);
    } catch (error) {
      logging.error(`${prefix}: Error fetching logs after ${eventCount} events in ${pages} pages`);
      throw error;
    } finally {
      if (pending) {
        // A callback can fail while the next request is running. Stop and settle it
        // before returning so no detached request survives the failed fetch.
        controller.abort();
        await pending;
      }
    }
    logging.info(
      `${prefix}: Processed ${eventCount} events in ${pages} pages (${rawCount} records, ${skipped} skipped). Status: ${status}. Cursor: ${safeCursor?.toISOString() ?? 'none'}`,
    );
  }
  return { safeCursor };
}
