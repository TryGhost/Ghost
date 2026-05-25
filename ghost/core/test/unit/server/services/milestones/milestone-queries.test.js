const db = require('../../../../../core/server/data/db');
// Load the model layer at import time — before db.knex is stubbed below — so
// Bookshelf is constructed once with the real knex instance and cached. The
// shared vitest afterEach hook lazily requires the jobs service (which pulls
// in models); without this, that require would re-run Bookshelf against the
// stubbed knex and throw "Invalid knex instance".
require('../../../../../core/server/models');
const MilestoneQueries = require('../../../../../core/server/services/milestones/milestone-queries');
const assert = require('node:assert/strict');
const sinon = require('sinon');

describe('MilestoneQueries', function () {
    let milestoneQueries;
    let queryMock;
    let knexMock;

    beforeAll(function () {
        queryMock = {
            groupBy: sinon.stub(),
            select: sinon.stub(),
            raw: sinon.stub(),
            count: sinon.stub(),
            where: sinon.stub()
        };

        knexMock = sinon.stub().returns(queryMock);

        sinon.stub(db, 'knex').get(function () {
            return knexMock;
        });
    });

    afterAll(function () {
        sinon.restore();
    });

    it('Provides expected public API', async function () {
        milestoneQueries = new MilestoneQueries({db: knexMock});

        assert.ok(milestoneQueries.getMembersCount);
        assert.ok(milestoneQueries.getARR);
        assert.ok(milestoneQueries.hasImportedMembersInPeriod);
        assert.ok(milestoneQueries.getDefaultCurrency);
    });
});
