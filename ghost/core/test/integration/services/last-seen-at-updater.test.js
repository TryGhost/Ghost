require('should');
const {agentProvider, fixtureManager, mockManager} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const assert = require('assert/strict');
const sinon = require('sinon');
let agent;

describe('Last Seen At Updater', function () {
    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('newsletters', 'members:newsletters');
        await agent.loginAsOwner();
    });

    describe('updateLastSeenAtWithoutKnownLastSeen', function () {
        it('works', async function () {
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

    describe('cachedUpdateLastSeenAt', function () {
        it('works', async function () {
            const membersEvents = require('../../../core/server/services/members-events');
    
            // Fire lots of MemberClickEvents for the same member
            const memberId = fixtureManager.get('members', 0).id;
            await models.Member.edit({last_seen_at: null}, {id: memberId});

            const previousLastSeen = new Date(Date.UTC(2099, 11, 29, 20, 0, 0, 0));
    
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
    
            const clock = sinon.useFakeTimers(firstDate);
    
            await membersEvents.lastSeenAtUpdater.cachedUpdateLastSeenAt(memberId, previousLastSeen, firstDate);

            await assertLastSeen(firstDate);
            await membersEvents.lastSeenAtUpdater.cachedUpdateLastSeenAt(memberId, firstDate, secondDate);
            await assertLastSeen(firstDate); // not changed

            // Advance the clock two hours to newDay
            await clock.tickAsync(1000 * 60 * 60 * 2); // 2 hours

            await membersEvents.lastSeenAtUpdater.cachedUpdateLastSeenAt(memberId, secondDate, newDay);
            await assertLastSeen(newDay); // changed
            clock.restore();
        });

        it('does not call updateLastSeenAt multiple times for the same member on the same day', async function () {
            const membersEvents = require('../../../core/server/services/members-events');
    
            // Clear the cache to ensure it's empty
            membersEvents.lastSeenAtUpdater._lastSeenAtCache.clear();

            // Fire lots of MemberClickEvents for the same member
            const memberId = fixtureManager.get('members', 0).id;
            await models.Member.edit({last_seen_at: null}, {id: memberId});

            const previousLastSeen = new Date(Date.UTC(2099, 11, 29, 20, 0, 0, 0));
    
            const firstDate = new Date(Date.UTC(2099, 11, 31, 21, 0, 0, 0));

            mockManager.mockSetting('timezone', 'CET');
    
            const clock = sinon.useFakeTimers(firstDate);

            const spy = sinon.spy(membersEvents.lastSeenAtUpdater, 'updateLastSeenAt');

            await Promise.all([
                membersEvents.lastSeenAtUpdater.cachedUpdateLastSeenAt(memberId, previousLastSeen, firstDate),
                membersEvents.lastSeenAtUpdater.cachedUpdateLastSeenAt(memberId, previousLastSeen, firstDate),
                membersEvents.lastSeenAtUpdater.cachedUpdateLastSeenAt(memberId, previousLastSeen, firstDate),
                membersEvents.lastSeenAtUpdater.cachedUpdateLastSeenAt(memberId, previousLastSeen, firstDate)
            ]);

            assert.equal(spy.callCount, 1);

            clock.restore();
        });
    });
});
