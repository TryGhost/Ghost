// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

const assert = require('assert/strict');
const sinon = require('sinon');
const {LastSeenAtUpdater} = require('../');
const DomainEvents = require('@tryghost/domain-events');
const {MemberPageViewEvent, MemberCommentEvent} = require('@tryghost/member-events');
const moment = require('moment');
const {EmailOpenedEvent} = require('@tryghost/email-events');

describe('LastSeenAtUpdater', function () {
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
            }
        });
        updater.subscribe(DomainEvents);
        sinon.stub(updater, 'updateLastSeenAt');
        DomainEvents.dispatch(MemberPageViewEvent.create({memberId: '1', memberLastSeenAt: previousLastSeen, url: '/'}, now.toDate()));
        assert(updater.updateLastSeenAt.calledOnceWithExactly('1', previousLastSeen, now.toDate()));
    });

    it('Calls updateLastSeenAt on email opened events', async function () {
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
            db
        });
        updater.subscribe(DomainEvents);
        sinon.spy(updater, 'updateLastSeenAt');
        sinon.spy(updater, 'updateLastSeenAtWithoutKnownLastSeen');
        DomainEvents.dispatch(EmailOpenedEvent.create({memberId: '1', emailRecipientId: '1', emailId: '1', timestamp: now.toDate()}));
        await DomainEvents.allSettled();
        assert(updater.updateLastSeenAtWithoutKnownLastSeen.calledOnceWithExactly('1', now.toDate()));
        assert(db.update.calledOnce);
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
            }
        });
        updater.subscribe(DomainEvents);
        sinon.stub(updater, 'updateLastCommentedAt');
        DomainEvents.dispatch(MemberCommentEvent.create({memberId: '1'}, now.toDate()));
        assert(updater.updateLastCommentedAt.calledOnceWithExactly('1', now.toDate()));
    });

    it('works correctly on another timezone (not updating last_seen_at)', async function () {
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
                        update: stub
                    }
                };
            }
        });
        await updater.updateLastSeenAt('1', previousLastSeen, now.toDate());
        assert(stub.notCalled, 'The LastSeenAtUpdater should attempt a member update when the new timestamp is within the same day in the publication timezone.');
    });

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
            }
        });
        await updater.updateLastCommentedAt('1', now.toDate());
        assert(stub.notCalled, 'The LastSeenAtUpdater should attempt a member update when the new timestamp is within the same day in the publication timezone.');
    });

    it('works correctly on another timezone (updating last_seen_at)', async function () {
        const now = moment('2022-02-28T04:00:00Z').utc();
        const previousLastSeen = moment('2022-02-27T20:00:00Z').toISOString();
        const stub = sinon.stub().resolves();
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
                        update: stub
                    }
                };
            }
        });
        await updater.updateLastSeenAt('1', previousLastSeen, now.toDate());
        assert(stub.calledOnceWithExactly({
            last_seen_at: now.format('YYYY-MM-DD HH:mm:ss')
        }, {
            id: '1'
        }), 'The LastSeenAtUpdater should attempt a member update with the current date.');
    });

    it('Doesn\'t update when last_seen_at is too recent', async function () {
        const now = moment('2022-02-28T18:00:00Z');
        const previousLastSeen = moment('2022-02-28T00:00:00Z').toISOString();
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
            }
        });
        await updater.updateLastSeenAt('1', previousLastSeen, now.toDate());
        assert(stub.notCalled, 'The LastSeenAtUpdater should\'t update a member when the previous last_seen_at is close to the event timestamp.');
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
            }
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
            }
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
            }
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
            }
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

    it('Doesn\'t fire on other events', async function () {
        const now = moment('2022-02-28T18:00:00Z');
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
            }
        });
        await updater.updateLastSeenAt('1', undefined, now.toDate());
        assert(stub.notCalled, 'The LastSeenAtUpdater should never fire on MemberPageViewEvent events.');
    });

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
