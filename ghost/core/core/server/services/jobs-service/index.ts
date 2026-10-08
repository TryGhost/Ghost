import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import { JobsService, JobsOutboxWiring } from './jobs-service';
import { JobsOutbox } from './jobs-outbox';
import { OutboxRelay } from './outbox-relay';
import { getOutboxConfig } from './outbox-config';
import type { JobsShutdownOptions } from '@tryghost/adapter-base-jobs';

const DatabaseInfo = require('@tryghost/database-info');

export interface JobsServiceInitOptions {
  knex: Knex;
  config: { get(key: string): unknown };
}

let instance: JobsService | undefined;

export function init({ knex, config }: JobsServiceInitOptions): JobsService {
  // The instance lives for the whole process: the didInit-guarded mentions
  // service captures it in MentionController and MentionSendingService, so
  // an in-process restart (test harness) must revive the same object rather
  // than strand those references on a stopped queue.
  if (instance) {
    instance.clearHandlers();
    return instance;
  }

  const adapterManager = require('../adapter-manager').default;
  const logging = require('@tryghost/logging');
  const sentry = require('../../../shared/sentry');
  const backend = adapterManager.getAdapter('jobs');

  // The outbox is active only when enabled AND the database is MySQL: the store
  // and relay are written for one dialect (FOR UPDATE SKIP LOCKED), and the
  // table is in-development so absent in production. Enabled-on-SQLite falls
  // back to the legacy direct path with a warning at start.
  const outboxConfig = getOutboxConfig(config);
  const isMySQL = DatabaseInfo.isMySQL(knex);
  const active = outboxConfig.enabled && isMySQL;

  let outbox: JobsOutboxWiring | undefined;
  if (active) {
    const store = new JobsOutbox({ knex });
    const relay = new OutboxRelay({
      outbox: store,
      backend,
      logging,
      sentry,
      pollIntervalMs: outboxConfig.pollIntervalMs,
      submissionTimeoutMs: outboxConfig.submissionTimeoutMs,
      retryDelayMs: outboxConfig.retryDelayMs,
    });
    outbox = { store, relay };
  }

  instance = new JobsService({
    backend,
    logging,
    sentry,
    outbox,
    logOutboxUnavailable: outboxConfig.enabled && !isMySQL,
  });

  return instance;
}

export function getInstance(): JobsService {
  if (!instance) {
    throw new errors.IncorrectUsageError({
      message: 'Jobs service used before init(). Call init() from boot first.',
    });
  }
  return instance;
}

export function shutdown(options?: JobsShutdownOptions): Promise<void> {
  if (!instance) {
    return Promise.resolve();
  }
  return instance.shutdown(options);
}
