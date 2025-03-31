const should = require('should');
const assert = require('assert/strict');
const sinon = require('sinon');
const LastSeenAtUpdater = require('../../../../../core/server/services/members-events/LastSeenAtUpdater');
const DomainEvents = require('@tryghost/domain-events');
const {MemberPageViewEvent, MemberCommentEvent, MemberSubscribeEvent, MemberLinkClickEvent} = require('@tryghost/member-events');
const moment = require('moment');
const {EmailOpenedEvent} = require('@tryghost/email-service');
const EventEmitter = require('events');
const logging = require('@tryghost/logging');

sinon.stub(logging, 'error');

describe('LastSeenAtUpdater', function () {
    let events;

    beforeEach(function () {
        events = new EventEmitter();
        DomainEvents.ee.removeAllListeners();
    });

    describe('constructor', function () {
        it('throws if getMembersApi is not passed to LastSeenAtUpdater', async function () {
            const settingsCache = sinon.stub().returns('Asia/Bangkok');

            should.throws(() => {
                new LastSeenAtUpdater({
                    services: {
                        settingsCache: {
                            get: settingsCache
                        }
                    }
                });
            }, 'Missing option getMembersApi');
        });
    });

    describe('subscribe', function () {
        it('Calls updateLastSeenAt on MemberPageViewEvents', async function () {
            const now = moment('2022-02-28T18:00:00Z').utc();
            const previousLastSeen = moment('2022-02-27T23:00:00Z').toISOString();
            const stub = sinon.stub().resolves();
            const settingsCache = sinon.stub().returns('Etc/UTC');
            const updater = new LastSeenAtUpdater({
                services: {
                    settingsCache: {
                        get: settingsCache
                    }
                },
                getMembersApi() {
                    return {
                        members: {
                            update: stub
                        }
                    };
                },
                events
            });
            updater.subscribe(DomainEvents);
            sinon.stub(updater, 'updateLastSeenAt');
            DomainEvents.dispatch(MemberPageViewEvent.create({memberId: '1', memberLastSeenAt: previousLastSeen, url: '/'}, now.toDate()));
            assert(updater.updateLastSeenAt.calledOnceWithExactly('1', previousLastSeen, now.toDate()));
        });

        it('Catches errors in updateLastSeenAt on MemberPageViewEvents', async function () {
            const now = moment('2022-02-28T18:00:00Z').utc();
            const previousLastSeen = moment('2022-02-27T23:00:00Z').toISOString();
            const stub = sinon.stub().resolves();
            const settingsCache = sinon.stub().returns('Etc/UTC');
            const updater = new LastSeenAtUpdater({
                services: {
                    settingsCache: {
                        get: settingsCache
                    }
                },
                getMembersApi() {
                    return {
                        members: {
                            update: stub
                        }
                    };
                },
                events
            });
            updater.subscribe(DomainEvents);
            sinon.stub(updater, 'updateLastSeenAt').throws('Error');
            DomainEvents.dispatch(MemberPageViewEvent.create({memberId: '1', memberLastSeenAt: previousLastSeen, url: '/'}, now.toDate()));
            assert(true, 'The LastSeenAtUpdater should catch errors in updateLastSeenAt');
        });

        it('Calls updateLastSeenAt on MemberLinkClickEvents', async function () {
            const now = moment('2022-02-28T18:00:00Z').utc();
            const previousLastSeen = moment('2022-02-27T23:00:00Z').toISOString();
            const stub = sinon.stub().resolves();
            const settingsCache = sinon.stub().returns('Etc/UTC');
            const updater = new LastSeenAtUpdater({
                services: {
                    settingsCache: {
                        get: settingsCache
                    }
                },
                getMembersApi() {
                    return {
                        members: {
                            update: stub
                        }
                    };
                },
                events
            });
            updater.subscribe(DomainEvents);
            sinon.stub(updater, 'updateLastSeenAt');
            DomainEvents.dispatch(MemberLinkClickEvent.create({memberId: '1', memberLastSeenAt: previousLastSeen, url: '/'}, now.toDate()));
            assert(updater.updateLastSeenAt.calledOnceWithExactly('1', previousLastSeen, now.toDate()));
        });

        it('Catches errors in updateLastSeenAt on MemberLinkClickEvents', async function () {
            const now = moment('2022-02-28T18:00:00Z').utc();
            const previousLastSeen = moment('2022-02-27T23:00:00Z').toISOString();
            const stub = sinon.stub().resolves();
            const settingsCache = sinon.stub().returns('Etc/UTC');
            const updater = new LastSeenAtUpdater({
                services: {
                    settingsCache: {
                        get: settingsCache
                    }
                },
                getMembersApi() {
                    return {
                        members: {
                            update: stub
                        }
                    };
                },
                events
            });
            updater.subscribe(DomainEvents);
            sinon.stub(updater, 'updateLastSeenAt').throws('Error');
            DomainEvents.dispatch(MemberLinkClickEvent.create({memberId: '1', memberLastSeenAt: previousLastSeen, url: '/'}, now.toDate()));
            assert(true, 'The LastSeenAtUpdater should catch errors in updateLastSeenAt');
        });

        it('Calls updateLastSeenAtWithoutKnownLastSeen on EmailOpenedEvents', async function () {
            const now = moment('2022-02-28T18:00:00Z').utc();
            const settingsCache = sinon.stub().returns('Etc/UTC');
            const db = {
                knex() {
                    return this;
                },
                where() {
                    return this;
                },
                andWhere() {
                    return this;
                },
                update: sinon.stub()
            };
            const updater = new LastSeenAtUpdater({
                services: {
                    settingsCache: {
                        get: settingsCache
                    }
                },
                getMembersApi() {
                    return {};
                },
                db,
                events
            });
            updater.subscribe(DomainEvents);
            sinon.spy(updater, 'updateLastSeenAt');
            sinon.spy(updater, 'updateLastSeenAtWithoutKnownLastSeen');
            DomainEvents.dispatch(EmailOpenedEvent.create({memberId: '1', emailRecipientId: '1', emailId: '1', timestamp: now.toDate()}));
            await DomainEvents.allSettled();
            assert(updater.updateLastSeenAtWithoutKnownLastSeen.calledOnceWithExactly('1', now.toDate()));
            assert(db.update.calledOnce);
        });

        it('Catches errors in updateLastSeenAtWithoutKnownLastSeen on EmailOpenedEvents', async function () {
            const now = moment('2022-02-28T18:00:00Z').utc();
            const settingsCache = sinon.stub().returns('Etc/UTC');
            const db = {
                knex() {
                    return this;
                },
                where() {
                    return this;
                },
                andWhere() {
                    return this;
                },
                update: sinon.stub()
            };
            const updater = new LastSeenAtUpdater({
                services: {
                    settingsCache: {
                        get: settingsCache
                    }
                },
                getMembersApi() {
                    return {};
                },
                db,
                events
            });
            updater.subscribe(DomainEvents);
            sinon.stub(updater, 'updateLastSeenAtWithoutKnownLastSeen').throws('Error');
            DomainEvents.dispatch(EmailOpenedEvent.create({memberId: '1', emailRecipientId: '1', emailId: '1', timestamp: now.toDate()}));
            await DomainEvents.allSettled();
            assert(true, 'The LastSeenAtUpdater should catch errors in updateLastSeenAtWithoutKnownLastSeen');
        });

        it('Calls updateLastCommentedAt on MemberCommentEvents', async function () {
            const now = moment('2022-02-28T18:00:00Z').utc();
            const stub = sinon.stub().resolves();
            const settingsCache = sinon.stub().returns('Etc/UTC');
            const updater = new LastSeenAtUpdater({
                services: {
                    settingsCache: {
                        get: settingsCache
                    }
                },
                getMembersApi() {
                    return {
                        members: {
                            update: stub
                        }
                    };
                },
                events
            });
            updater.subscribe(DomainEvents);
            sinon.stub(updater, 'updateLastCommentedAt');
            DomainEvents.dispatch(MemberCommentEvent.create({memberId: '1'}, now.toDate()));
            assert(updater.updateLastCommentedAt.calledOnceWithExactly('1', now.toDate()));
        });

        it('Catches errors in updateLastCommentedAt on MemberCommentEvents', async function () {
            const now = moment('2022-02-28T18:00:00Z').utc();
            const stub = sinon.stub().resolves();
            const settingsCache = sinon.stub().returns('Etc/UTC');
            const updater = new LastSeenAtUpdater({
                services: {
                    settingsCache: {
                        get: settingsCache
                    }
                },
                getMembersApi() {
                    return {
                        members: {
                            update: stub
                        }
                    };
                },
                events
            });
            updater.subscribe(DomainEvents);
            sinon.stub(updater, 'updateLastCommentedAt').throws('Error');
            DomainEvents.dispatch(MemberCommentEvent.create({memberId: '1'}, now.toDate()));
            assert(true, 'The LastSeenAtUpdater should catch errors in updateLastCommentedAt');
        });

        it('Doesn\'t fire on other events', async function () {
            const spy = sinon.spy();
            const updater = new LastSeenAtUpdater({
                services: {
                    settingsCache: {
                        get: () => 'Etc/UTC'
                    }
                },
                getMembersApi() {
                    return {
                        members: {
                            update: spy
                        }
                    };
                },
                events
            });
            updater.subscribe(DomainEvents);
            DomainEvents.dispatch(MemberSubscribeEvent.create({memberId: '1', source: 'api'}, new Date()));
            await DomainEvents.allSettled();
            assert(spy.notCalled, 'The LastSeenAtUpdater should never fire on MemberSubscribeEvent events.');
        });

        describe('Disable via config', function () {
            it('MemberLinkClickEvent should not be fired when disabled', async function () {
                const now = moment.utc('2022-02-28T18:00:00Z');
                const previousLastSeen = moment.utc('2022-02-27T22:59:00Z').toDate();
                const stub = sinon.stub().resolves();
                const settingsCache = sinon.stub();
                settingsCache.returns('Europe/Brussels'); // Default return for other settings
                const configStub = sinon.stub();
                configStub.withArgs('backgroundJobs:clickTrackingLastSeenAtUpdater').returns(false);

                const updater = new LastSeenAtUpdater({
                    services: {
                        settingsCache: {
                            get: settingsCache
                        }
                    },
                    config: {
                        get: configStub
                    },
                    getMembersApi() {
                        return {
                            members: {
                                update: stub,
                                get: () => {
                                    return {
                                        id: '1',
                                        get: () => {
                                            return previousLastSeen;
                                        }
                                    };
                                }
                            }
                        };
                    },
                    events
                });
                updater.subscribe(DomainEvents);
                sinon.stub(updater, 'updateLastSeenAt');
                DomainEvents.dispatch(MemberLinkClickEvent.create({memberId: '1', memberLastSeenAt: previousLastSeen, url: '/'}, now.toDate()));
                assert(updater.updateLastSeenAt.notCalled, 'The LastSeenAtUpdater should not attempt a member update when disabled');
            });

            it('MemberLinkClickEvent should be fired when enabled/empty', async function () {
                const now = moment.utc('2022-02-28T18:00:00Z');
                const previousLastSeen = moment.utc('2022-02-27T22:59:00Z').toDate();
                const stub = sinon.stub().resolves();
                const settingsCache = sinon.stub();
                settingsCache.returns('Europe/Brussels'); // Default return for other settings

                const updater = new LastSeenAtUpdater({
                    services: {
                        settingsCache: {
                            get: settingsCache
                        }
                    },
                    getMembersApi() {
                        return {
                            members: {
                                update: stub,
                                get: () => {
                                    return {
                                        id: '1',
                                        get: () => {
                                            return previousLastSeen;
                                        }
                                    };
                                }
                            }
                        };
                    },
                    events
                });
                updater.subscribe(DomainEvents);
                sinon.stub(updater, 'updateLastSeenAt');
                DomainEvents.dispatch(MemberLinkClickEvent.create({memberId: '1', memberLastSeenAt: previousLastSeen, url: '/'}, now.toDate()));
                assert(updater.updateLastSeenAt.calledOnce, 'The LastSeenAtUpdater should attempt a member update when not disabled');
            });
        });
    });

    describe('updateLastSeenAt', function () {
        it('works correctly on another timezone (not updating last_seen_at)', async function () {
            const now = moment('2022-02-28T04:00:00Z').utc();
            const previousLastSeen = moment('2022-02-27T20:00:00Z').toISOString();
            const transactionStub = sinon.stub().callsFake((callback) => {
                return callback();
            });
            const saveStub = sinon.stub().resolves();
            const getStub = sinon.stub().resolves({get: () => previousLastSeen, save: saveStub});
            const settingsCache = sinon.stub().returns('Asia/Bangkok');
            const updater = new LastSeenAtUpdater({
                services: {
                    settingsCache: {
                        get: settingsCache
                    }
                },
                getMembersApi() {
                    return {
                        members: {
                            get: getStub
                        }
                    };
                },
                db: {
                    knex: {
                        transaction: transactionStub
                    }
                },
                events
            });
            await updater.updateLastSeenAt('1', previousLastSeen, now.toDate());
            assert(saveStub.notCalled, 'The LastSeenAtUpdater should attempt a member update when the new timestamp is within the same day in the publication timezone.');
        });

        it('works correctly on another timezone (updating last_seen_at)', async function () {
            const now = moment('2022-02-28T04:00:00Z').utc();
            const previousLastSeen = moment('2022-02-27T20:00:00Z').toISOString();
            const transactionStub = sinon.stub().callsFake((callback) => {
                return callback();
            });
            const saveStub = sinon.stub().resolves();
            const refreshStub = sinon.stub().resolves({save: saveStub});
            const getStub = sinon.stub().resolves({get: () => previousLastSeen, refresh: refreshStub});
            const settingsCache = sinon.stub().returns('Europe/Paris');
            const updater = new LastSeenAtUpdater({
                services: {
                    settingsCache: {
                        get: settingsCache
                    }
                },
                getMembersApi() {
                    return {
                        members: {
                            get: getStub
                        }
                    };
                },
                db: {
                    knex: {
                        transaction: transactionStub
                    }
                },
                events
            });
            await updater.updateLastSeenAt('1', previousLastSeen, now.toDate());
            assert(saveStub.calledOnceWithExactly(
                sinon.match({last_seen_at: now.tz('utc').format('YYYY-MM-DD HH:mm:ss')}),
                sinon.match({transacting: sinon.match.any, patch: true, method: 'update'})
            ), 'The LastSeenAtUpdater should attempt a member update with the current date.');
        });

        it('Doesn\'t update when last_seen_at is too recent', async function () {
            const now = moment('2022-02-28T18:00:00Z');
            const previousLastSeen = moment('2022-02-28T00:00:00Z').toISOString();
            const saveStub = sinon.stub().resolves();
            const getStub = sinon.stub().resolves({get: () => previousLastSeen, save: saveStub});
            const transactionStub = sinon.stub().callsFake((callback) => {
                return callback();
            });
            const settingsCache = sinon.stub().returns('Etc/UTC');
            const updater = new LastSeenAtUpdater({
                services: {
                    settingsCache: {
                        get: settingsCache
                    }
                },
                getMembersApi() {
                    return {
                        members: {
                            get: getStub
                        }
                    };
                },
                db: {
                    knex: {
                        transaction: transactionStub
                    }
                },
                events
            });
            await updater.updateLastSeenAt('1', previousLastSeen, now.toDate());
            assert(saveStub.notCalled, 'The LastSeenAtUpdater should\'t update a member when the previous last_seen_at is close to the event timestamp.');
        });

        it('avoids a race condition when updating last_seen_at', async function () {
            const now = moment.utc('2022-02-28T18:00:00Z');
            const saveStub = sinon.stub().resolves();
            const refreshStub = sinon.stub().resolves({save: saveStub});
            const settingsCache = sinon.stub().returns('Europe/Brussels');
            const transactionStub = sinon.stub().callsFake((callback) => {
                return callback();
            });
            const getStub = sinon.stub();
            getStub.onFirstCall().resolves({get: () => null, save: saveStub, refresh: refreshStub});
            getStub.onSecondCall().resolves({get: () => now.toDate(), save: saveStub, refresh: refreshStub});
            getStub.resolves({get: () => now.toDate(), save: saveStub, refresh: refreshStub});
            const updater = new LastSeenAtUpdater({
                services: {
                    settingsCache: {
                        get: settingsCache
                    }
                },
                getMembersApi() {
                    return {
                        members: {
                            get: getStub
                        }
                    };
                },
                db: {
                    knex: {
                        transaction: transactionStub
                    }
                },
                events
            });
            sinon.stub(events, 'emit');
            await Promise.all([
                updater.updateLastSeenAt('1', null, now.toDate()),
                updater.updateLastSeenAt('1', null, now.toDate()),
                updater.updateLastSeenAt('1', null, now.toDate()),
                updater.updateLastSeenAt('1', null, now.toDate())
            ]);
            assert(saveStub.calledOnce, `The LastSeenAtUpdater should attempt a member update only once, but was called ${saveStub.callCount} times`);
            assert(saveStub.calledOnceWithExactly(
                sinon.match({last_seen_at: now.tz('utc').format('YYYY-MM-DD HH:mm:ss')}),
                sinon.match({transacting: undefined, patch: true, method: 'update'})
            ), 'The LastSeenAtUpdater should attempt a member update with the current date.');

            assert(events.emit.calledOnceWithExactly(
                'member.edited',
                sinon.match.any
            ), 'The LastSeenAtUpdater should emit a member.edited event if it updated last_seen_at');
        });
    });

    describe('cachedUpdateLastSeenAt', function () {
        it('calls updateLastSeenAt if the member has not been seen today', async function () {
            const now = moment.utc('2022-02-28T18:00:00Z');
            const clock = sinon.useFakeTimers(now.toDate());
            const saveStub = sinon.stub().resolves();
            const refreshStub = sinon.stub().resolves({save: saveStub});
            const settingsCache = sinon.stub().returns('Europe/Brussels');
            const transactionStub = sinon.stub().callsFake((callback) => {
                return callback();
            });
            const getStub = sinon.stub();
            getStub.onFirstCall().resolves({get: () => null, save: saveStub, refresh: refreshStub});
            getStub.onSecondCall().resolves({get: () => now.toDate(), save: saveStub, refresh: refreshStub});
            getStub.resolves({get: () => now.toDate(), save: saveStub, refresh: refreshStub});
            const updater = new LastSeenAtUpdater({
                services: {
                    settingsCache: {
                        get: settingsCache
                    }
                },
                getMembersApi() {
                    return {
                        members: {
                            get: getStub
                        }
                    };
                },
                db: {
                    knex: {
                        transaction: transactionStub
                    }
                },
                events
            });
            sinon.stub(events, 'emit');
            sinon.stub(updater, 'updateLastSeenAt');
            await updater.cachedUpdateLastSeenAt('1', now.toDate(), now.toDate());
            assert(updater.updateLastSeenAt.calledOnceWithExactly('1', now.toDate(), now.toDate()));
            clock.restore();
        });

        it('only calls updateLastSeenAt once per day per member', async function () {
            const now = moment.utc('2022-02-28T18:00:00Z');
            const previousLastSeen = moment.utc('2022-02-26T00:00:00Z').toDate();
            const clock = sinon.useFakeTimers(now.toDate());
            const saveStub = sinon.stub().resolves();
            const refreshStub = sinon.stub().resolves({save: saveStub});
            const settingsCache = sinon.stub().returns('Europe/Brussels');
            const transactionStub = sinon.stub().callsFake((callback) => {
                return callback();
            });
            const getStub = sinon.stub();
            getStub.onFirstCall().resolves({get: () => null, save: saveStub, refresh: refreshStub});
            getStub.onSecondCall().resolves({get: () => now.toDate(), save: saveStub, refresh: refreshStub});
            getStub.resolves({get: () => now.toDate(), save: saveStub, refresh: refreshStub});
            const updater = new LastSeenAtUpdater({
                services: {
                    settingsCache: {
                        get: settingsCache
                    }
                },
                getMembersApi() {
                    return {
                        members: {
                            get: getStub
                        }
                    };
                },
                db: {
                    knex: {
                        transaction: transactionStub
                    }
                },
                events
            });
            sinon.stub(events, 'emit');
            sinon.spy(updater, 'updateLastSeenAt');
            await Promise.all([
                updater.cachedUpdateLastSeenAt('1', previousLastSeen, now.toDate()),
                updater.cachedUpdateLastSeenAt('1', previousLastSeen, now.toDate()),
                updater.cachedUpdateLastSeenAt('1', previousLastSeen, now.toDate()),
                updater.cachedUpdateLastSeenAt('1', previousLastSeen, now.toDate())
            ]);
            assert(updater.updateLastSeenAt.calledOnce, 'The LastSeenAtUpdater should only update a member once per day.');
            clock.restore();
        });

        it('calls updateLastSeenAt again if it fails the first time', async function () {
            const now = moment.utc('2022-02-28T18:00:00Z');
            const previousLastSeen = moment.utc('2022-02-26T00:00:00Z').toDate();
            const clock = sinon.useFakeTimers(now.toDate());
            const saveStub = sinon.stub().resolves();
            const refreshStub = sinon.stub().resolves({save: saveStub});
            const settingsCache = sinon.stub().returns('Europe/Brussels');
            // Throw an error on the first transaction, succeed on the second
            const transactionStub = sinon.stub().onCall(0).throws('Error').onCall(1).callsFake((callback) => {
                return callback();
            });
            const getStub = sinon.stub();
            getStub.onFirstCall().resolves({get: () => null, save: saveStub, refresh: refreshStub});
            getStub.onSecondCall().resolves({get: () => now.toDate(), save: saveStub, refresh: refreshStub});
            getStub.resolves({get: () => now.toDate(), save: saveStub, refresh: refreshStub});
            const updater = new LastSeenAtUpdater({
                services: {
                    settingsCache: {
                        get: settingsCache
                    }
                },
                getMembersApi() {
                    return {
                        members: {
                            get: getStub
                        }
                    };
                },
                db: {
                    knex: {
                        transaction: transactionStub
                    }
                },
                events
            });
            sinon.stub(events, 'emit');
            sinon.spy(updater, 'updateLastSeenAt');
            assert.rejects(updater.cachedUpdateLastSeenAt('1', previousLastSeen, now.toDate()));
            await updater.cachedUpdateLastSeenAt('1', previousLastSeen, now.toDate());
            assert(updater.updateLastSeenAt.calledTwice, 'The LastSeenAtUpdater should attempt to update a member again if the first update fails.');
            clock.restore();
        });
    });

    describe('updateLastCommentedAt', function () {
        it('works correctly on another timezone (not updating last_commented_at)', async function () {
            const now = moment('2022-02-28T04:00:00Z').utc();
            const previousLastSeen = moment('2022-02-27T20:00:00Z').toISOString();
            const stub = sinon.stub().resolves();
            const settingsCache = sinon.stub().returns('Asia/Bangkok');
            const updater = new LastSeenAtUpdater({
                services: {
                    settingsCache: {
                        get: settingsCache
                    }
                },
                getMembersApi() {
                    return {
                        members: {
                            update: stub,
                            get: () => {
                                return {
                                    id: '1',
                                    get: () => {
                                        return previousLastSeen;
                                    }
                                };
                            }
                        }
                    };
                },
                events
            });
            await updater.updateLastCommentedAt('1', now.toDate());
            assert(stub.notCalled, 'The LastSeenAtUpdater should attempt a member update when the new timestamp is within the same day in the publication timezone.');
        });

        it('Doesn\'t update when last_commented_at is too recent', async function () {
            const now = moment('2022-02-28T18:00:00Z');
            const previousLastSeen = moment('2022-02-28T00:00:00Z').toDate();
            const stub = sinon.stub().resolves();
            const settingsCache = sinon.stub().returns('Etc/UTC');
            const updater = new LastSeenAtUpdater({
                services: {
                    settingsCache: {
                        get: settingsCache
                    }
                },
                getMembersApi() {
                    return {
                        members: {
                            update: stub,
                            get: () => {
                                return {
                                    id: '1',
                                    get: () => {
                                        return previousLastSeen;
                                    }
                                };
                            }
                        }
                    };
                },
                events
            });
            await updater.updateLastCommentedAt('1', now.toDate());
            assert(stub.notCalled, 'The LastSeenAtUpdater should\'t update a member');
        });

        it('Does not update when last_commented_at is same date in timezone', async function () {
            const now = moment.utc('2022-02-28T18:00:00Z');
            const previousLastSeen = moment.utc('2022-02-27T23:59:00Z').toDate();
            const stub = sinon.stub().resolves();
            const settingsCache = sinon.stub().returns('Europe/Brussels');
            const updater = new LastSeenAtUpdater({
                services: {
                    settingsCache: {
                        get: settingsCache
                    }
                },
                getMembersApi() {
                    return {
                        members: {
                            update: stub,
                            get: () => {
                                return {
                                    id: '1',
                                    get: () => {
                                        return previousLastSeen;
                                    }
                                };
                            }
                        }
                    };
                },
                events
            });
            await updater.updateLastCommentedAt('1', now.toDate());
            assert(stub.notCalled, 'The LastSeenAtUpdater should\'t update a member.');
        });

        it('Does update when last_commented_at is different date', async function () {
            const now = moment.utc('2022-02-28T18:00:00Z');
            const previousLastSeen = moment.utc('2022-02-27T22:59:00Z').toDate();
            const stub = sinon.stub().resolves();
            const settingsCache = sinon.stub().returns('Europe/Brussels');
            const updater = new LastSeenAtUpdater({
                services: {
                    settingsCache: {
                        get: settingsCache
                    }
                },
                getMembersApi() {
                    return {
                        members: {
                            update: stub,
                            get: () => {
                                return {
                                    id: '1',
                                    get: () => {
                                        return previousLastSeen;
                                    }
                                };
                            }
                        }
                    };
                },
                events
            });
            await updater.updateLastCommentedAt('1', now.toDate());
            assert(stub.calledOnce, 'The LastSeenAtUpdater should attempt a member update');

            assert(stub.calledOnceWithExactly({
                last_seen_at: now.tz('utc').format('YYYY-MM-DD HH:mm:ss'),
                last_commented_at: now.tz('utc').format('YYYY-MM-DD HH:mm:ss')
            }, {
                id: '1'
            }), 'The LastSeenAtUpdater should attempt a member update with the current date.');
        });

        it('Does update when last_commented_at is null', async function () {
            const now = moment.utc('2022-02-28T18:00:00Z');
            const previousLastSeen = null;
            const stub = sinon.stub().resolves();
            const settingsCache = sinon.stub().returns('Etc/UTC');
            const updater = new LastSeenAtUpdater({
                services: {
                    settingsCache: {
                        get: settingsCache
                    }
                },
                getMembersApi() {
                    return {
                        members: {
                            update: stub,
                            get: () => {
                                return {
                                    id: '1',
                                    get: () => {
                                        return previousLastSeen;
                                    }
                                };
                            }
                        }
                    };
                },
                events
            });
            await updater.updateLastCommentedAt('1', now.toDate());
            assert(stub.calledOnce, 'The LastSeenAtUpdater should attempt a member update');

            assert(stub.calledOnceWithExactly({
                last_seen_at: now.tz('utc').format('YYYY-MM-DD HH:mm:ss'),
                last_commented_at: now.tz('utc').format('YYYY-MM-DD HH:mm:ss')
            }, {
                id: '1'
            }), 'The LastSeenAtUpdater should attempt a member update with the current date.');
        });
    });
});
