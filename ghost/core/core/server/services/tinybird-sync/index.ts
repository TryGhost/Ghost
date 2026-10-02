import ObjectId from 'bson-objectid';
import logging from '@tryghost/logging';
import config from '../../../shared/config';
// @ts-expect-error This module lacks type definitions.
import labs from '../../../shared/labs';
// @ts-expect-error This module lacks type definitions.
import settingsCache from '../../../shared/settings-cache';
import { knex } from '../../data/db';
import { createTinybirdSyncService } from './tinybird-sync-service';

const service = createTinybirdSyncService({
  config,
  settingsCache,
  labs,
  knex,
  logging,
  random: Math.random,
  now: () => new Date(),
  fetch: globalThis.fetch,
  createId: () => ObjectId().toHexString(),
});

export const scheduleJob = service.scheduleJob;
export const sync = service.sync;
