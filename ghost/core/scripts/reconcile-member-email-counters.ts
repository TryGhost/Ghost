import { parseArgs } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import { IncorrectUsageError } from '@tryghost/errors';
import type { Knex } from 'knex';
import { NewsletterMemberCounters } from '../core/server/services/email-analytics/newsletter-member-counters';

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      limit: { type: 'string', default: '5000' },
      pages: { type: 'string', default: '1' },
      'pause-ms': { type: 'string', default: '0' },
      restart: { type: 'boolean', default: false },
    },
  });
  const limit = Number(values.limit);
  const pages = Number(values.pages);
  const pauseMs = Number(values['pause-ms']);
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 5000 ||
    !Number.isSafeInteger(pages) ||
    pages < 1 ||
    !Number.isSafeInteger(pauseMs) ||
    pauseMs < 0
  ) {
    throw new IncorrectUsageError({
      message:
        'Use --limit 1..5000, a positive integer --pages and a non-negative --pause-ms between pages; --restart abandons any existing checkpoint and starts a new sweep.',
    });
  }
  const db: { knex: Knex } = require('../core/server/data/db');
  try {
    const counters = new NewsletterMemberCounters(db.knex);
    for (let page = 0; page < pages; page++) {
      const state = await counters.runSweepPage({ limit, restart: page === 0 && values.restart });
      process.stdout.write(`${JSON.stringify(state)}\n`);
      if (state.complete) {
        break;
      }
      if (pauseMs > 0 && page + 1 < pages) {
        // Let member-facing writes that waited behind the page's locks proceed.
        await delay(pauseMs);
      }
    }
  } finally {
    await db.knex.destroy();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : 'Member reconciliation failed'}\n`,
  );
  process.exitCode = 1;
});
