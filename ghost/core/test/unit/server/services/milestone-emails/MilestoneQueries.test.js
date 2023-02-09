const db = require('../../../../../core/server/data/db');
const models = require('../../../../../core/server/models');
const assert = require('assert');

describe('MilestoneQueries', function () {
    let milestoneQueries;

    before(function () {
        models.init();
    });

    describe('Milestone Emails Service', function () {
        it('Provides expected public API', async function () {
            const MilestoneQueries = require('../../../../../core/server/services/milestone-emails/MilestoneQueries');
            milestoneQueries = new MilestoneQueries({db});

            assert.ok(milestoneQueries.getMembersCount);
            assert.ok(milestoneQueries.getARR);
            assert.ok(milestoneQueries.hasImportedMembersInPeriod);
            assert.ok(milestoneQueries.getDefaultCurrency);
        });
    });
});
