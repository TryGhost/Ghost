import { setTimeout as setTimeoutPromise } from 'node:timers/promises';
import ObjectId from 'bson-objectid';
import logging from '@tryghost/logging';
import config from '../../../shared/config';
// @ts-expect-error This module lacks type definitions.
import settingsCache from '../../../shared/settings-cache';
import { knex } from '../../data/db';
import { createTinybirdSyncService } from './tinybird-sync-service';

const service = createTinybirdSyncService({
  config,
  settingsCache,
  knex,
  logging,
  sleep: async (ms) => {
    await setTimeoutPromise(ms, undefined, { ref: false });
  },
  random: Math.random,
  now: () => new Date(),
  fetch: globalThis.fetch,
  createId: () => ObjectId().toHexString(),
});

export const start = service.start;
