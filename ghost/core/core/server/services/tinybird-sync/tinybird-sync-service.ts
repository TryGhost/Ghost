import type { Knex } from 'knex';
import {
  getIngestConfig,
  type GetIngestConfigDependencies,
  type IngestConfig,
} from './get-ingest-config';
import { AUTOMATION_SYNC_TARGETS, syncTableToTinybird } from './sync-table-to-tinybird';

const INTERVAL_MS = 5 * 60 * 1000;
const BATCH_SIZE = 5000;
// This should be a little less than the maximum, because rows are chunked by
// JSON line, not bytes strictly.
const MAX_PAYLOAD_BYTES = 9 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 60 * 1000;

type Logger = {
  error(error: unknown, message?: string): void;
  info(...args: unknown[]): void;
};

type TinybirdSyncDependencies = GetIngestConfigDependencies & {
  knex: Knex;
  logging: Logger;
  sleep: (ms: number) => Promise<void>;
  random: () => number;
  now: () => Date;
  fetch: typeof globalThis.fetch;
  createId: () => string;
};

export function createTinybirdSyncService({
  config,
  settingsCache,
  knex,
  logging,
  sleep,
  random,
  now,
  fetch,
  createId,
}: TinybirdSyncDependencies) {
  let started = false;

  const syncAll = async (ingest: IngestConfig): Promise<void> => {
    const results = await Promise.allSettled(
      AUTOMATION_SYNC_TARGETS.map(async (target) => {
        const sent = await syncTableToTinybird(target, {
          knex,
          ...ingest,
          now,
          fetch,
          createId,
          batchSize: BATCH_SIZE,
          maxPayloadBytes: MAX_PAYLOAD_BYTES,
          requestTimeoutMs: REQUEST_TIMEOUT_MS,
        });
        logging.info(
          { system: { event: 'tinybird.sync.completed', table: target.table, sent } },
          `[Tinybird sync] ${target.table}: sent ${sent} rows`,
        );
      }),
    );

    for (const result of results) {
      if (result.status === 'rejected') {
        logging.error(result.reason, '[Tinybird sync] Failed to sync table');
      }
    }
  };

  const runLoop = async (ingest: IngestConfig): Promise<never> => {
    await sleep(Math.floor(random() * INTERVAL_MS));

    while (true) {
      await syncAll(ingest);
      await sleep(INTERVAL_MS);
    }
  };

  const start = (): void => {
    if (started) {
      return;
    }

    const ingest = getIngestConfig({ config, settingsCache });
    if (!ingest) {
      logging.info('[Tinybird sync] Not started: Traffic Analytics service is not configured');
      return;
    }

    started = true;
    void runLoop(ingest)
      .then(() => {
        logging.error('[Tinybird sync] Loop stopped unexpectedly');
      })
      .catch((error: unknown) => {
        logging.error(error, '[Tinybird sync] Loop stopped');
      });
  };

  return { start };
}
