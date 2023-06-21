require('should');
const {agentProvider, fixtureManager, mockManager} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const assert = require('assert/strict');
let agent;

describe('Last Seen At Updater', function () {
    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('newsletters', 'members:newsletters');
        await agent.loginAsOwner();
    });

    it('updateLastSeenAtWithoutKnownLastSeen', async function () {
        const membersEvents = require('../../../core/server/services/members-events');

        // Fire lots of EmailOpenedEvent for the same
        const memberId = fixtureManager.get('members', 0).id;

        const firstDate = new Date(Date.UTC(2099, 11, 31, 21, 0, 0, 0));
        // In UTC this is 2099-12-31 21:00:00
        // In CET this is 2099-12-31 22:00:00

        const secondDate = new Date(Date.UTC(2099, 11, 31, 22, 0, 0, 0));
        // In UTC this is 2099-12-31 22:00:00
        // In CET this is 2099-12-31 23:00:00

        const newDay = new Date(Date.UTC(2099, 11, 31, 23, 0, 0, 0));
        // In UTC this is 2099-12-31 23:00:00
        // In CET this is 2100-01-01 00:00:00

        async function assertLastSeen(date) {
            const member = await models.Member.findOne({id: memberId}, {require: true});
            assert.equal(member.get('last_seen_at').getTime(), date.getTime());
        }

        mockManager.mockSetting('timezone', 'CET');

        await membersEvents.lastSeenAtUpdater.updateLastSeenAtWithoutKnownLastSeen(memberId, firstDate);
        await assertLastSeen(firstDate);
        await membersEvents.lastSeenAtUpdater.updateLastSeenAtWithoutKnownLastSeen(memberId, secondDate);
        await assertLastSeen(firstDate); // not changed
        await membersEvents.lastSeenAtUpdater.updateLastSeenAtWithoutKnownLastSeen(memberId, newDay);
        await assertLastSeen(newDay); // changed
    });
});
