const StatsService = require('../../../../../core/server/services/stats/stats-service');
const knex = require('knex').default;
const assert = require('node:assert/strict');

describe('StatsService', function () {
    it('Exposes a create factory', function () {
        const service = StatsService.create({knex: knex({client: 'sqlite3', connection: {filename: ':memory:'}})});
        assert(service instanceof StatsService);
    });
});
