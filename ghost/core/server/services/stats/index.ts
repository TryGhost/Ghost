import { defineService } from '../../../kernel/define-service';

type StatsAggregate = {
  // The stats services are JavaScript outside the TypeScript build, so their
  // JSDoc types aren't visible here until they're converted.
  api: any;
  cache: object | null;
};

/**
 * Wires the Stats API over the application's database, URL and Tinybird
 * services and publishes it together with the optional host stats cache.
 */
export default defineService('Stats', (): StatsAggregate => {
  const StatsService = require('./stats-service');
  const { create: createTinybirdClient, initializeTinybirdForStats } = require('./utils/tinybird');
  const db = require('../../data/db');
  const urlService = require('../url');
  const urlUtils = require('../../../shared/url-utils').default;
  const config = require('../../../shared/config');
  const settingsCache = require('../../../shared/settings-cache');
  const request = require('../../lib/request-external');
  const logging = require('@tryghost/logging');
  const TinybirdServiceWrapper = require('../tinybird');
  const adapterManager = require('../adapter-manager').default;

  const webAnalyticsEnabled = initializeTinybirdForStats({
    config,
    settingsCache,
    tinybirdWrapper: TinybirdServiceWrapper,
  });

  // The query client keeps this Tinybird instance; config and settings are
  // read again for every request it builds.
  const tinybirdClient = webAnalyticsEnabled
    ? createTinybirdClient({
        config,
        request,
        settingsCache,
        logging,
        tinybirdService: TinybirdServiceWrapper.instance,
      })
    : null;

  const api = StatsService.create({
    knex: db.knex,
    urlService,
    urlUtils,
    logging,
    tinybirdClient,
  });

  const cache = config.get('hostSettings:statsCache:enabled')
    ? adapterManager.getAdapter('cache:stats')
    : null;

  return { api, cache };
});
