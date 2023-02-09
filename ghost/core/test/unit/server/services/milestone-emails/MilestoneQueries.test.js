const db = require('../../../../../core/server/data/db');
const models = require('../../../../../core/server/models');
const assert = require('assert');
const sinon = require('sinon');

describe('MilestoneQueries', function () {
    let milestoneQueries;
    let queryMock;
    let knexMock;

    before(function () {
        models.init();

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

    describe('Milestone Emails Service', function () {
        it('Provides expected public API', async function () {
            const MilestoneQueries = require('../../../../../core/server/services/milestone-emails/MilestoneQueries');
            milestoneQueries = new MilestoneQueries({db: knexMock});

            assert.ok(milestoneQueries.getMembersCount);
            assert.ok(milestoneQueries.getARR);
            assert.ok(milestoneQueries.hasImportedMembersInPeriod);
            assert.ok(milestoneQueries.getDefaultCurrency);
        });
    });
});
