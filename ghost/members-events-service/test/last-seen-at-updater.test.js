// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

const assert = require('assert');
const sinon = require('sinon');
const LastSeenAtUpdater = require('../lib/last-seen-at-updater');
const DomainEvents = require('@tryghost/domain-events');
const {MemberPageViewEvent, MemberSubscribeEvent} = require('@tryghost/member-events');

describe('LastSeenAtUpdater', function () {
    it('Fires on MemberPageViewEvent events', async function () {
        const now = new Date();
        const previousLastSeen = new Date(now.getTime() - 48 * 3600 * 1000).toISOString(); // 48 hours
        const spy = sinon.spy();
        new LastSeenAtUpdater({
            memberModel: {
                update: spy
            }
        });
        DomainEvents.dispatch(MemberPageViewEvent.create({memberId: '1', memberLastSeenAt: previousLastSeen, url: '/'}, now));
        assert(spy.calledOnceWithExactly({
            last_seen_at: now.toISOString().replace('T', ' ').replace(/\..+/, '')
        }, {
            id: '1'
        }), 'The LastSeenAtUpdater should attempt a member update with the current date.');
    });

    it('Doesn\'t update when last_seen_at is too recent', async function () {
        const now = new Date();
        const previousLastSeen = new Date(now.getTime() - 1 * 3600 * 1000).toISOString(); // 1 hour
        const spy = sinon.spy();
        new LastSeenAtUpdater({
            memberModel: {
                update: spy
            }
        });
        DomainEvents.dispatch(MemberPageViewEvent.create({memberId: '1', memberLastSeenAt: previousLastSeen, url: '/'}, now));
        assert(spy.notCalled, 'The LastSeenAtUpdater should\'t update a member when the previous last_seen_at is close to the event timestamp.');
    });

    it('Doesn\'t fire on other events', async function () {
        const spy = sinon.spy();
        new LastSeenAtUpdater({
            memberModel: {
                update: spy
            }
        });
        DomainEvents.dispatch(MemberSubscribeEvent.create({memberId: '1', source: 'api'}, new Date()));
        assert(spy.notCalled, 'The LastSeenAtUpdater should never fire on MemberPageViewEvent events.');
    });
});
