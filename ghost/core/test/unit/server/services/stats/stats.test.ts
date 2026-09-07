import assert from 'node:assert/strict';
import knex from 'knex';
// @ts-expect-error This module lacks type definitions.
import StatsService from '../../../../../core/server/services/stats/stats-service';

describe('StatsService', function () {
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
