import ObjectID from 'bson-objectid';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import logging from '@tryghost/logging';
import type { Knex } from 'knex';
import { EventProcessingResult } from './event-processing-result';

const JOB_PREFIX = 'email-analytics-webhook-stats-';

/** Queues and batches newsletter statistics across webhook requests. */
export class WebhookStatsAggregator {
  private running = false;
  private readonly deps: {
    knex: Knex;
    aggregate: (result: EventProcessingResult, transaction: Knex.Transaction) => Promise<unknown>;
  };

  constructor(deps: WebhookStatsAggregator['deps']) {
    this.deps = deps;
  }

  async enqueue({ emailIds, memberIds }: EventProcessingResult): Promise<void> {
    const names = [
      ...new Set([
        ...emailIds.map((id) => `${JOB_PREFIX}email:${id}`),
        ...memberIds.map((id) => `${JOB_PREFIX}member:${id}`),
      ]),
    ].sort();

    // Keep inserts within database parameter limits.
    for (let offset = 0; offset < names.length; offset += 100) {
      await this.deps
        .knex('jobs')
        .insert(
          names.slice(offset, offset + 100).map((name) => ({
            id: new ObjectID().toHexString(),
            name,
            status: 'queued',
            created_at: new Date(),
            metadata: new ObjectID().toHexString(),
          })),
        )
        .onConflict('name')
        .merge(['metadata']);
    }
  }

  async flush(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    try {
      const { knex } = this.deps;
      const connection = await knex.client.acquireConnection();
      let lockName: string | undefined;
      try {
        if (knex.client.config.client === 'mysql2') {
          const [[{ database }]] = await knex
            .raw('SELECT DATABASE() AS `database`')
            .connection(connection);
          assert.equal(typeof database, 'string', 'Webhook statistics require a database');
          // Advisory locks are server-wide and limited to 64 characters.
          lockName = `ghost-email-webhook-stats:${createHash('sha256').update(database).digest('hex').slice(0, 32)}`;
          const [[{ acquired }]] = await knex
            .raw('SELECT GET_LOCK(?, 0) AS acquired', [lockName])
            .connection(connection);
          if (acquired === 0) {
            lockName = undefined;
            return;
          }
          assert.equal(acquired, 1, 'Could not acquire webhook statistics lock');
        }
        await this.drain(connection);
      } finally {
        try {
          if (lockName) {
            try {
              const [[{ released }]] = await knex
                .raw('SELECT RELEASE_LOCK(?) AS released', [lockName])
                .connection(connection);
              assert.equal(released, 1, 'Could not release webhook statistics lock');
            } catch (err) {
              logging.error(err);
              // Discard the connection if its lock may still be held.
              await knex.client.destroyRawConnection(connection);
            }
          }
        } finally {
          await knex.client.releaseConnection(connection);
        }
      }
    } finally {
      this.running = false;
    }
  }

  private async drain(connection: unknown): Promise<void> {
    // Share the lock connection so losing the lock also stops these writes.
    for (const [kind, batchSize] of [
      ['email', 1],
      ['member', 100],
    ] as const) {
      const prefix = `${JOB_PREFIX}${kind}:`;
      const end: { name: string } | undefined = await this.deps
        .knex('jobs')
        .select('name')
        .where('name', 'like', `${prefix}%`)
        .orderBy('name', 'desc')
        .first()
        .connection(connection);
      if (!end) {
        continue;
      }
      let after = prefix;
      do {
        const jobs: { id: string; name: string; metadata: string | null }[] = await this.deps
          .knex('jobs')
          .select('id', 'name', 'metadata')
          .where('name', 'like', `${prefix}%`)
          .where('name', '>', after)
          .where('name', '<=', end.name)
          .orderBy('name')
          .limit(batchSize)
          .connection(connection);
        if (!jobs.length) {
          break;
        }
        await this.deps.knex.transaction(
          async (transaction) => {
            const ids = jobs.map((job) => job.name.slice(prefix.length));
            await this.deps.aggregate(
              new EventProcessingResult(kind === 'email' ? { emailIds: ids } : { memberIds: ids }),
              transaction,
            );
            // Delete after counting, retaining work re-enqueued with a newer token.
            for (const job of jobs) {
              await transaction('jobs').where({ id: job.id, metadata: job.metadata }).delete();
            }
          },
          { connection },
        );
        // Re-enqueued IDs wait for the next run, keeping this run bounded.
        after = jobs[jobs.length - 1].name;
      } while (after < end.name);
    }
  }
}
