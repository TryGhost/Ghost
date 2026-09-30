import type { Knex } from 'knex';
import {
  getIngestConfig,
  type GetIngestConfigDependencies,
  type IngestConfig,
} from './get-ingest-config';
import { AUTOMATION_SYNC_TARGETS, syncTableToTinybird } from './sync-table-to-tinybird';
import TinybirdSyncJob from './jobs/tinybird-sync-job';
import type { JobsService } from '../jobs-service/jobs-service';

const BATCH_SIZE = 5000;
// This should be a little less than the maximum, because rows are chunked by
// JSON line, not bytes strictly.
const MAX_PAYLOAD_BYTES = 9 * 1024 * 1024;
const MAX_PAYLOAD_MESSAGES = 1000;
const REQUEST_TIMEOUT_MS = 5 * 60 * 1000;

type Logger = {
  error(error: unknown, message?: string): void;
  info(...args: unknown[]): void;
};

type Labs = {
  isSet(feature: string): boolean;
};

type TinybirdSyncDependencies = GetIngestConfigDependencies & {
  labs: Labs;
  knex: Knex;
  logging: Logger;
  random: () => number;
  now: () => Date;
  fetch: typeof globalThis.fetch;
  createId: () => string;
};

// Runs every five minutes at a random second and minute offset, so instances
// do not all sync at the same time.
function randomFiveMinuteCron(random: () => number): string {
  const seconds = Math.floor(random() * 60); // 0-59
  const minutes = Math.floor(random() * 5); // 0-4

  return `${seconds} ${minutes}/5 * * * *`;
}

export function createTinybirdSyncService({
  config,
  settingsCache,
  labs,
  knex,
  logging,
  random,
  now,
  fetch,
  createId,
}: TinybirdSyncDependencies) {
  let scheduled = false;
  let syncing = false;

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
          maxPayloadMessages: MAX_PAYLOAD_MESSAGES,
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

  const isEnabled = (): boolean => labs.isSet('automationsTinybirdSync');

  // Runs one sync pass. A call that arrives while a pass is still running is
  // skipped rather than run alongside it, so passes never overlap.
  const sync = async (): Promise<void> => {
    if (!isEnabled()) {
      return;
    }

    const ingest = getIngestConfig({ config, settingsCache });
    if (!ingest) {
      return;
    }

    if (syncing) {
      logging.info('[Background Job] tinybird-sync skipped because a sync is already running');
      return;
    }

    syncing = true;
    try {
      await syncAll(ingest);
    } finally {
      syncing = false;
    }
  };

  const scheduleJob = async (
    jobsService: Pick<JobsService, 'scheduleRecurring'>,
  ): Promise<void> => {
    if (scheduled) {
      return;
    }

    if (!getIngestConfig({ config, settingsCache })) {
      logging.info('[Tinybird sync] Not started: Traffic Analytics service is not configured');
      return;
    }

    scheduled = true;

    const isSyncEnabled = labs.isSet('automationsTinybirdSync');
    logging.info(
      { system: { event: 'tinybird.sync.started' } },
      `[Tinybird sync] Started: sync ${isSyncEnabled ? 'enabled' : 'disabled'} by labs flag (but may change)`,
    );

    const at = randomFiveMinuteCron(random);
    logging.info(`[Background Job] ${TinybirdSyncJob.type} scheduled at ${at}`);
    try {
      await jobsService.scheduleRecurring(new TinybirdSyncJob(), { cron: at });
    } catch (error) {
      // Unmarked so a later call can retry the registration.
      scheduled = false;
      throw error;
    }
  };

  return { scheduleJob, sync, isEnabled };
}
