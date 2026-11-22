import logging from '@tryghost/logging';
import { defineService } from '#kernel/define-service';
import schema from '../../data/schema/schema';
import { ActionLog } from '../../lib/action-log/action-log';
import { recordSegmentChanges } from '../../lib/action-log/segments';
import { SegmentsService } from './service';
import { refreshSettingsCache } from './settings-cache';
import { SettingsSegmentRepository } from './settings-repository';

/** The setting the segments are stored in, as Admin's saved member views. */
const SETTING_KEY = 'shared_views';

// Needs the database connection and the settings cache, which boot has ready before
// initServices.
export default defineService('Segments', () => {
  const db: typeof import('../../data/db') = require('../../data/db');
  const settingsCache: typeof import('../../../shared/settings-cache') = require('../../../shared/settings-cache');
  const recordHistory = recordSegmentChanges(new ActionLog(), SETTING_KEY);
  const refreshCache = refreshSettingsCache({
    knex: db.knex,
    cache: settingsCache,
    logging,
    settingKey: SETTING_KEY,
  });

  return new SegmentsService({
    knex: db.knex,
    repository: new SettingsSegmentRepository({
      key: SETTING_KEY,
      logging,
      maxValueLength: schema.settings.value.maxlength,
    }),
    // Each change is logged as a staff action inside the command that made it, and the settings
    // cache is refreshed once the command's transaction has committed.
    onSegmentUpdated: async (trx, context, change) => {
      await recordHistory(trx, context, change);
      await refreshCache(trx, context, change);
    },
  });
});
