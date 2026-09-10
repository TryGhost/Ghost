import logging from '@tryghost/logging';
import { InternalServerError } from '@tryghost/errors';
import { getMailgunConfig, getMailgunDomains, type ConfigReader } from '../lib/mailgun-config';
import { MailgunLogsClient, type MailgunAnalyticsEvent } from './mailgun-logs-client';

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
  // Keep callbacks serial: all domains share the active lane's processor state.
  for (const domain of getMailgunDomains(config, mailgun.domain)) {
    let token: string | undefined;
    const seenTokens = new Set<string>();
    let eventCount = 0;
    do {
      const page = await client.getPage({
        domain,
        tags,
        events,
        begin: windowBegin,
        end: windowEnd,
        token,
      });
      if (!page.empty && page.next) {
        if (seenTokens.has(page.next)) {
          throw new InternalServerError({ message: 'Invalid Mailgun Logs pagination' });
        }
        seenTokens.add(page.next);
      }
      if (page.items.length) {
        await batchHandler(page.items);
        eventCount += page.items.length;
        const last = page.items[page.items.length - 1].timestamp;
        // Re-cover the boundary on the next fetch, but finish begin-time ties to make progress.
        if (eventCount >= maxEvents && last > windowBegin) {
          if (!safeCursor || last < safeCursor) {
            safeCursor = last;
          }
          break;
        }
      }
      token = page.empty ? undefined : page.next;
    } while (token);
  }
  return { safeCursor };
}
