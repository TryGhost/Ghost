import logging from '@tryghost/logging';
import { getMailgunConfig, getMailgunDomains, type ConfigReader } from '../lib/mailgun-config';
import { MailgunLogsClient, type MailgunAnalyticsEvent } from './mailgun-logs-client';

// A domain whose pages keep paging without matching events still bounds its
// work: raw records count toward the budget, and pages are capped outright.
const MAX_PAGES_PER_DOMAIN = 1000;

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
    try {
      do {
        const page = await client.getPage({
          domain,
          tags,
          events,
          begin: windowBegin,
          end: windowEnd,
          token,
        });
        pages += 1;
        rawCount += page.rawCount;
        skipped += page.skipped;
        if (page.lastTimestamp && (!covered || page.lastTimestamp > covered)) {
          covered = page.lastTimestamp;
        }
        if (page.items.length) {
          await batchHandler(page.items);
          eventCount += page.items.length;
        }
        // Re-cover the boundary on the next fetch, but finish begin-time ties to make progress.
        const budgetSpent = eventCount >= maxEvents || rawCount >= maxEvents;
        if (budgetSpent && covered && covered > windowBegin) {
          cap(covered);
          status = 'capped';
          break;
        }
        if (!page.next) {
          break;
        }
        // A provider that echoes the last token has nothing more; one that
        // repeats an earlier token must not skip anything. The page was still
        // delivered, and the cursor rests on what the domain covered so far.
        const repeated = seenTokens.has(page.next);
        seenTokens.add(page.next);
        if (repeated || pages >= MAX_PAGES_PER_DOMAIN) {
          logging.warn(
            repeated
              ? `${prefix}: repeated pagination token after ${pages} pages`
              : `${prefix}: stopped after ${pages} pages`,
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
    }
    logging.info(
      `${prefix}: Processed ${eventCount} events in ${pages} pages (${rawCount} records, ${skipped} skipped). Status: ${status}. Cursor: ${safeCursor?.toISOString() ?? 'none'}`,
    );
  }
  return { safeCursor };
}
