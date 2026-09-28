import ObjectID from 'bson-objectid';
import type { Knex } from 'knex';
import { EventProcessingResult } from './event-processing-result';

const JOB_PREFIX = 'email-analytics-webhook-stats-';

/** Durable, coalesced statistics work. Recipient and safety writes stay in the webhook. */
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

    // Fixed-size inserts bound SQL parameters even for a multi-event notification.
    for (let offset = 0; offset < names.length; offset += 100) {
      await this.deps
        .knex('jobs')
        .insert(
          names.slice(offset, offset + 100).map((name) => ({
            id: new ObjectID().toHexString(),
            name,
            status: 'queued',
            created_at: new Date(),
          })),
        )
        .onConflict('name')
        .ignore();
    }
  }

  async flush(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    try {
      // One newsletter per transaction keeps its pending job lock short. Member
      // stats use the existing processor's batching configuration, up to 100 IDs.
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
          .first();
        if (!end) {
          continue;
        }
        let after = prefix;
        do {
          const lastName = await this.deps.knex.transaction(async (transaction) => {
            const jobs: { id: string; name: string }[] = await transaction('jobs')
              .select('id', 'name')
              .where('name', 'like', `${prefix}%`)
              .where('name', '>', after)
              .where('name', '<=', end.name)
              .orderBy('name')
              .limit(batchSize)
              .forUpdate();
            if (!jobs.length) {
              return null;
            }
            const ids = jobs.map((job) => job.name.slice(prefix.length));
            await this.deps.aggregate(
              new EventProcessingResult(kind === 'email' ? { emailIds: ids } : { memberIds: ids }),
              transaction,
            );
            // The same transaction commits counts and removes pending work.
            // A concurrent enqueue waits on these job rows, then inserts fresh
            // work after deletion. Rollback or process exit leaves work queued.
            await transaction('jobs')
              .whereIn(
                'id',
                jobs.map((job) => job.id),
              )
              .delete();
            return jobs[jobs.length - 1].name;
          });
          if (!lastName) {
            break;
          }
          // Re-enqueued IDs behind this cursor wait until the next scheduled run,
          // so a busy newsletter cannot force repeated counts in the same run.
          after = lastName;
        } while (after < end.name);
      }
    } finally {
      this.running = false;
    }
  }
}
