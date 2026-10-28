/**
 * Wires the Stats API over the application's database, URL and Tinybird
 * services and publishes it with the optional host stats cache.
 */
class StatsServiceWrapper {
  // The stats service is untyped JavaScript.
  api: any = null;
  cache: object | null = null;

  async init(): Promise<void> {
    if (this.api) {
      // Already done
      return;
    }

    const StatsService = require('./stats-service');
    const { create: createTinybirdClient } = require('./utils/tinybird');
    const db = require('../../data/db');
    const urlService = require('../url');
    const urlUtils = require('../../../shared/url-utils').default;
    const config = require('../../../shared/config');
    const settingsCache = require('../../../shared/settings-cache');
    const request = require('../../lib/request-external');
    const logging = require('@tryghost/logging');
    const TinybirdServiceWrapper = require('../tinybird');
    const adapterManager = require('../adapter-manager').default;

    const webAnalyticsEnabled = settingsCache.get('web_analytics_enabled');
    if (webAnalyticsEnabled || config.get('tinybird:stats')) {
      TinybirdServiceWrapper.init();
    }

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

    this.api = StatsService.create({
      knex: db.knex,
      urlService,
      urlUtils,
      logging,
      tinybirdClient,
    });

    if (config.get('hostSettings:statsCache:enabled')) {
      this.cache = adapterManager.getAdapter('cache:stats');
    }
  }
}

module.exports = new StatsServiceWrapper();
