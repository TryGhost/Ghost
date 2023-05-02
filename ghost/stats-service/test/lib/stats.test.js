const StatsService = require('../../lib/StatsService');
const knex = require('knex').default;
const assert = require('assert');

describe('StatsService', function () {
    it('Exposes a create factory', function () {
        const service = StatsService.create({knex: knex({client: 'sqlite3', connection: {filename: ':memory:'}})});
        assert(service instanceof StatsService);
    });
});
