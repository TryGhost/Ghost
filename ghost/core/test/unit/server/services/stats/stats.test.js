const StatsService = require('../../../../../core/server/services/stats/StatsService');
const knex = require('knex').default;
const assert = require('assert/strict');

describe('StatsService', function () {
    it('Exposes a create factory', function () {
        const service = StatsService.create({knex: knex({client: 'sqlite3', connection: {filename: ':memory:'}})});
        assert(service instanceof StatsService);
    });
});
