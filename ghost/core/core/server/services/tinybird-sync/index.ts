import type { JobsService } from '../jobs-service/jobs-service';
import TinybirdSyncJob from './tinybird-sync-job';
import { AUTOMATION_SYNC_TARGETS, syncTableToTinybird } from './sync-table-to-tinybird';

const logging = require('@tryghost/logging');

interface IngestConfig {
  endpoint: string;
  token: string;
  siteUuid: string;
}

function getIngestConfig(): IngestConfig | null {
  const config = require('../../../shared/config');
  const settingsCache = require('../../../shared/settings-cache');

  const stats = config.get('tinybird:stats');
  if (!stats) {
    return null;
  }

  const local = stats.local?.enabled ? stats.local : null;
  const endpoint = local ? local.endpoint : stats.endpoint;
  const token = local ? local.token : config.get('tinybird:adminToken');
  const siteUuid = stats.id || settingsCache.get('site_uuid');

  return endpoint && token && siteUuid ? { endpoint, token, siteUuid } : null;
}

const randomBelow = (max: number) => Math.floor(Math.random() * max);

// Every five minutes, offset per process so sites don't all hit Tinybird at the same instant.
const randomFiveMinuteCron = () => `${randomBelow(60)} ${randomBelow(5)}/5 * * * *`;

let hasScheduled = false;

export async function scheduleTinybirdSyncJob(
  jobsService: Pick<JobsService, 'scheduleRecurring'>,
): Promise<void> {
  if (hasScheduled || process.env.NODE_ENV?.startsWith('test')) {
    return;
  }
  if (!getIngestConfig()) {
    logging.info('[Background Job] tinybird-sync not scheduled: Tinybird is not configured');
    return;
  }

  const cron = randomFiveMinuteCron();
  logging.info(`[Background Job] tinybird-sync scheduled at ${cron}`);
  await jobsService.scheduleRecurring(new TinybirdSyncJob(), { cron });

  hasScheduled = true;
}

async function syncAll(): Promise<void> {
  const ingest = getIngestConfig();
  if (!ingest) {
    return;
  }

  const { knex } = require('../../data/db');

  const results = await Promise.allSettled(
    AUTOMATION_SYNC_TARGETS.map(async (target) => {
      const sent = await syncTableToTinybird(target, { knex, ...ingest });
      if (sent) {
        logging.info(
          { system: { event: 'tinybird.sync.completed', table: target.table, sent } },
          `[Tinybird sync] ${target.table}: sent ${sent} rows`,
        );
      }
    }),
  );

  const failures = results.filter((result) => result.status === 'rejected');
  // Log every failure so neither table's error is lost, then let the first one fail the job.
  for (const failure of failures.slice(1)) {
    logging.error(failure.reason);
  }
  if (failures.length) {
    throw failures[0].reason;
  }
}

let inFlight: Promise<void> | null = null;

// A run can outlast the five-minute interval on a large backlog; the jobs backend
// processes concurrently, so overlapping runs would race on the watermark.
export function run(): Promise<void> {
  inFlight ??= syncAll().finally(() => {
    inFlight = null;
  });
  return inFlight;
}
