import logging from '@tryghost/logging';
import * as errors from '@tryghost/errors';
import type { JobsService } from '../jobs-service/jobs-service';
import CheckSigningKeysJob from './check-signing-keys-job';
import { SigningKeyService } from './signing-key-service';

export type { SigningKeyProvider, SigningKeyPurpose } from './signing-key-service';

let service: SigningKeyService | undefined;
let jobs: JobsService | undefined;
let scheduled = false;

// Runs after settings init so the key rows exist; advances any rotation that's due before
// anything signs or publishes a key.
export async function init(): Promise<void> {
  if (service) {
    return;
  }

  const settingsCache = require('../../../shared/settings-cache');
  const models = require('../../models');
  const instance = new SigningKeyService({
    settingsCache,
    Settings: models.Settings,
    transaction: (fn) => models.Base.transaction(fn),
    logging,
    onRotationStarted: schedule,
  });
  await instance.check();
  service = instance;
}

export function getInstance(): SigningKeyService {
  if (!service) {
    throw new errors.IncorrectUsageError({
      message: 'Signing keys used before init(). Call init() from boot first.',
    });
  }
  return service;
}

export async function scheduleCheckJob(jobsService: JobsService): Promise<void> {
  jobs = jobsService;

  // Nothing to advance until a key is rotated
  if (getInstance().isRotating()) {
    await schedule();
  }
}

// Before background services start there's no jobs service yet; scheduleCheckJob covers boot
async function schedule(): Promise<void> {
  if (scheduled || !jobs || process.env.NODE_ENV?.startsWith('test')) {
    return;
  }

  // Random minute so a fleet of sites doesn't check at once
  const cron = `${Math.floor(Math.random() * 60)} ${Math.floor(Math.random() * 60)} * * * *`;
  logging.info(`[Background Job] check-signing-keys scheduled at ${cron}`);
  await jobs.scheduleRecurring(new CheckSigningKeysJob(), { cron });
  scheduled = true;
}
