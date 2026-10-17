import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import { JobsService, JobsOutboxWiring } from './jobs-service';
import { JobsOutbox } from './jobs-outbox';
import { OutboxRelay } from './outbox-relay';
import { getOutboxConfig } from './outbox-config';
import {
  isInDevelopmentTable,
  shouldCreateInDevelopmentTables,
} from '../../data/schema/in-development';
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

  const outboxConfig = getOutboxConfig(config);
  // The relay claims rows with FOR UPDATE SKIP LOCKED, which SQLite does not have.
  const isMySQL = DatabaseInfo.isMySQL(knex);
  // jobs_outbox is still in development, so until its migration lands it only
  // exists where in-development tables are created. Enabling the flag elsewhere
  // must not make every dispatch fail on a missing table.
  const tableAvailable = !isInDevelopmentTable('jobs_outbox') || shouldCreateInDevelopmentTables();
  const active = outboxConfig.enabled && isMySQL && tableAvailable;

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
    logOutboxUnavailable: outboxConfig.enabled && !active,
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
