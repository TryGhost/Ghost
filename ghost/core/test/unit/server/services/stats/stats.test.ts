import assert from 'node:assert/strict';
import knex from 'knex';
import sinon from 'sinon';
const TinybirdServiceWrapper = require('../../../../../core/server/services/tinybird');
// @ts-expect-error This module lacks type definitions.
import StatsService from '../../../../../core/server/services/stats/stats-service';

describe('StatsService', function () {
  afterEach(() => sinon.restore());

  it.each([
    { webAnalytics: false, sync: true, configured: true, initialized: true },
    { webAnalytics: false, sync: false, configured: true, initialized: false },
    { webAnalytics: false, sync: true, configured: false, initialized: false },
    { webAnalytics: true, sync: false, configured: true, initialized: true },
  ])(
    'initializes Tinybird for the enabled analytics source: %j',
    function ({ webAnalytics, sync, configured, initialized }) {
      const init = sinon.stub(TinybirdServiceWrapper, 'init');
      const isSet = sinon.stub();
      isSet.withArgs('automationsTinybirdSync').returns(sync);
      const getSetting = sinon.stub();
      getSetting.withArgs('web_analytics_enabled').returns(webAnalytics);
      const getConfig = sinon.stub();
      getConfig
        .withArgs('tinybird:stats')
        .returns(configured ? { endpoint: 'https://api.tinybird.co' } : null);
      const service = StatsService.create({
        knex: knex({
          client: 'better-sqlite3',
          useNullAsDefault: true,
          connection: { filename: ':memory:' },
        }),
        settingsCache: { get: getSetting },
        config: { get: getConfig },
        labs: { isSet },
      });
      assert.equal(init.calledOnce, initialized);
      assert.equal(Boolean(service.posts.tinybirdClient), webAnalytics);
      assert.equal(Boolean(service.content.tinybirdClient), webAnalytics);
    },
  );
  it('Exposes a create factory', function () {
    const service = StatsService.create({
      knex: knex({
        client: 'better-sqlite3',
        useNullAsDefault: true,
        connection: { filename: ':memory:' },
      }),
    });
    assert(service instanceof StatsService);
  });
});
