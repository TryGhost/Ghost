import assert from 'node:assert/strict';
import knex from 'knex';
// @ts-expect-error This module lacks type definitions.
import StatsService from '../../../../../core/server/services/stats/stats-service';
const logging = require('@tryghost/logging');
const urlUtils = require('../../../../../core/shared/url-utils').default;

describe('StatsService', function () {
  it('Exposes a create factory that shares one dependency set across the query services', function () {
    const db = knex({
      client: 'better-sqlite3',
      useNullAsDefault: true,
      connection: { filename: ':memory:' },
    });
    const urlService = {};
    const tinybirdClient = { fetch: async () => [] };

    const service = StatsService.create({
      knex: db,
      urlService,
      urlUtils,
      logging,
      tinybirdClient,
    });

    assert(service instanceof StatsService);
    for (const name of ['mrr', 'members', 'subscriptions', 'referrers', 'posts', 'content']) {
      assert.equal(service[name].knex, db, name);
    }
    assert.equal(service.posts.tinybirdClient, tinybirdClient);
    assert.equal(service.content.tinybirdClient, tinybirdClient);
    assert.equal(service.posts.urlService, urlService);
    assert.equal(service.content.urlService, urlService);
    assert.equal(service.posts.urlUtils, urlUtils);
    assert.equal(service.posts.logging, logging);
    assert.equal(service.content.logging, logging);
  });
});
