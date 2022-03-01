// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

const assert = require('assert');
const sinon = require('sinon');
const {LastSeenAtUpdater} = require('../');
const DomainEvents = require('@tryghost/domain-events');
const {MemberPageViewEvent, MemberSubscribeEvent} = require('@tryghost/member-events');
const moment = require('moment');

describe('LastSeenAtUpdater', function () {
    it('Fires on MemberPageViewEvent events', async function () {
        const now = moment('2022-02-28T18:00:00Z').utc();
        const previousLastSeen = moment('2022-02-27T23:00:00Z').toISOString();
        const spy = sinon.spy();
        const settingsCache = sinon.stub().returns('Etc/UTC');
        new LastSeenAtUpdater({
            models: {
                Member: {
                    update: spy
                }
            },
            services: {
                settingsCache: {
                    get: settingsCache
                }
            }
        });
        DomainEvents.dispatch(MemberPageViewEvent.create({memberId: '1', memberLastSeenAt: previousLastSeen, url: '/'}, now.toDate()));
        assert(spy.calledOnceWithExactly({
            last_seen_at: now.format('YYYY-MM-DD HH:mm:ss')
        }, {
            id: '1'
        }), 'The LastSeenAtUpdater should attempt a member update with the current date.');
    });

    it('works correctly on another timezone (not updating last_seen_at)', async function () {
        const now = moment('2022-02-28T04:00:00Z').utc();
        const previousLastSeen = moment('2022-02-27T20:00:00Z').toISOString();
        const spy = sinon.spy();
        const settingsCache = sinon.stub().returns('Asia/Bangkok');
        new LastSeenAtUpdater({
            models: {
                Member: {
                    update: spy
                }
            },
            services: {
                settingsCache: {
                    get: settingsCache
                }
            }
        });
        DomainEvents.dispatch(MemberPageViewEvent.create({memberId: '1', memberLastSeenAt: previousLastSeen, url: '/'}, now.toDate()));
        assert(spy.notCalled, 'The LastSeenAtUpdater should attempt a member update when the new timestamp is within the same day in the publication timezone.');
    });

    it('works correctly on another timezone (updating last_seen_at)', async function () {
        const now = moment('2022-02-28T04:00:00Z').utc();
        const previousLastSeen = moment('2022-02-27T20:00:00Z').toISOString();
        const spy = sinon.spy();
        const settingsCache = sinon.stub().returns('Europe/Paris');
        new LastSeenAtUpdater({
            models: {
                Member: {
                    update: spy
                }
            },
            services: {
                settingsCache: {
                    get: settingsCache
                }
            }
        });
        DomainEvents.dispatch(MemberPageViewEvent.create({memberId: '1', memberLastSeenAt: previousLastSeen, url: '/'}, now.toDate()));
        assert(spy.calledOnceWithExactly({
            last_seen_at: now.format('YYYY-MM-DD HH:mm:ss')
        }, {
            id: '1'
        }), 'The LastSeenAtUpdater should attempt a member update with the current date.');
    });

    it('Doesn\'t update when last_seen_at is too recent', async function () {
        const now = moment('2022-02-28T18:00:00Z');
        const previousLastSeen = moment('2022-02-28T00:00:00Z').toISOString();
        const spy = sinon.spy();
        const settingsCache = sinon.stub().returns('Etc/UTC');
        new LastSeenAtUpdater({
            models: {
                Member: {
                    update: spy
                }
            },
            services: {
                settingsCache: {
                    get: settingsCache
                }
            }
        });
        DomainEvents.dispatch(MemberPageViewEvent.create({memberId: '1', memberLastSeenAt: previousLastSeen, url: '/'}, now.toDate()));
        assert(spy.notCalled, 'The LastSeenAtUpdater should\'t update a member when the previous last_seen_at is close to the event timestamp.');
    });

    it('Doesn\'t fire on other events', async function () {
        const now = moment('2022-02-28T18:00:00Z');
        const spy = sinon.spy();
        const settingsCache = sinon.stub().returns('Etc/UTC');
        new LastSeenAtUpdater({
            models: {
                Member: {
                    update: spy
                }
            },
            services: {
                settingsCache: {
                    get: settingsCache
                }
            }
        });
        DomainEvents.dispatch(MemberSubscribeEvent.create({memberId: '1', source: 'api'}, now.toDate()));
        assert(spy.notCalled, 'The LastSeenAtUpdater should never fire on MemberPageViewEvent events.');
    });
});
