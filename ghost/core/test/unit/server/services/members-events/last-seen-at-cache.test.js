const LastSeenAtCache = require('../../../../../core/server/services/members-events/LastSeenAtCache');
const assert = require('assert/strict');
const sinon = require('sinon');
const moment = require('moment-timezone');

describe('LastSeenAtCache', function () {
    let clock;
    before(function () {
        clock = sinon.useFakeTimers();
    });

    afterEach(function () {
        clock.restore();
    });

    describe('constructor', function () {
        it('intitializes an instance of the LastSeenAtCache successfully', function () {
            const lastSeenAtCache = new LastSeenAtCache({
                services: {
                    settingsCache: {
                        get() {
                            return 'Etc/UTC';
                        }
                    }
                }
            });
            assert.ok(lastSeenAtCache._cache instanceof Set, 'lastSeenAtCache._cache should be a Set');
            assert.equal(lastSeenAtCache._settingsCache.get('timezone'), 'Etc/UTC', 'lastSeenAtCache._timezone should be set');
            assert.ok(lastSeenAtCache._startOfDay, 'lastSeenAtCache._startOfDay should be set');
        });
    });

    describe('_getStartOfCurrentDay', function () {
        it('returns the start of the current day in the site timezone', async function () {
            const now = moment('2022-02-28T18:00:00Z').utc();
            clock = sinon.useFakeTimers(now.toDate());
            const lastSeenAtCache = new LastSeenAtCache({
                services: {
                    settingsCache: {
                        get() {
                            return 'Etc/UTC';
                        }
                    }
                }
            });
            const result = lastSeenAtCache._getStartOfCurrentDay();
            assert.equal(result, '2022-02-28T00:00:00.000Z', 'start of the current day in UTC should be returned');
        });

        it('works correctly on another timezone', async function () {
            const now = moment('2022-02-28T18:00:00Z').utc(); // 2022-02-28 01:00:00 in Bangkok
            clock = sinon.useFakeTimers(now.toDate());
            const lastSeenAtCache = new LastSeenAtCache({
                services: {
                    settingsCache: {
                        get() {
                            return 'Asia/Bangkok';
                        }
                    }
                }
            });
            const result = lastSeenAtCache._getStartOfCurrentDay();
            assert.equal(result, '2022-02-28T17:00:00.000Z', 'start of the current day in Bangkok should be returned'); // 2022-02-28 00:00:00 in Bankok
        });

        it('defaults to Etc/UTC if the timezone is not set', async function () {
            const now = moment('2022-02-28T18:00:00Z').utc();
            clock = sinon.useFakeTimers(now.toDate());
            const lastSeenAtCache = new LastSeenAtCache({
                services: {
                    settingsCache: {
                        get() {
                            return null;
                        }
                    }
                }
            });
            const result = lastSeenAtCache._getStartOfCurrentDay();
            assert.equal(result, '2022-02-28T00:00:00.000Z', 'start of the current day in UTC should be returned');
        });
    });

    describe('add', function () {
        it('adds a member id to the cache', async function () {
            const lastSeenAtCache = new LastSeenAtCache({
                services: {
                    settingsCache: {
                        get() {
                            return 'Etc/UTC';
                        }
                    }
                }
            });
            lastSeenAtCache.add('member-id');
            assert.ok(lastSeenAtCache._cache.has('member-id'));
        });
    });

    describe('remove', function () {
        it('removes a member id from the cache', async function () {
            const lastSeenAtCache = new LastSeenAtCache({
                services: {
                    settingsCache: {
                        get() {
                            return 'Etc/UTC';
                        }
                    }
                }
            });
            lastSeenAtCache.add('member-id');
            assert.equal(lastSeenAtCache._cache.size, 1, 'the member id should be in the cache');
            lastSeenAtCache.remove('member-id');
            assert.equal(lastSeenAtCache._cache.size, 0, 'the member id should be removed from the cache');
        });
    });

    describe('_has', function () {
        it('returns true if the member id is in the cache', async function () {
            const lastSeenAtCache = new LastSeenAtCache({
                services: {
                    settingsCache: {
                        get() {
                            return 'Etc/UTC';
                        }
                    }
                }
            });
            lastSeenAtCache.add('member-id');
            assert.equal(lastSeenAtCache._has('member-id'), true, 'the member id should be in the cache');
        });

        it('returns false if the member id is not in the cache', async function () {
            const lastSeenAtCache = new LastSeenAtCache({
                services: {
                    settingsCache: {
                        get() {
                            return 'Etc/UTC';
                        }
                    }
                }
            });
            assert.equal(lastSeenAtCache._has('member-id'), false, 'the member id should not be in the cache');
        });
    });

    describe('clear', function () {
        it('clears the cache', async function () {
            const lastSeenAtCache = new LastSeenAtCache({
                services: {
                    settingsCache: {
                        get() {
                            return 'Etc/UTC';
                        }
                    }
                }
            });
            lastSeenAtCache.add('member-id');
            lastSeenAtCache.clear();
            assert.equal(lastSeenAtCache._cache.size, 0, 'the cache should be empty');
        });
    });

    describe('_shouldClear', function () {
        it('returns true only if the day has changed', async function () {
            const now = moment('2022-02-28T18:00:00Z').utc();
            clock = sinon.useFakeTimers(now.toDate());
            const lastSeenAtCache = new LastSeenAtCache({
                services: {
                    settingsCache: {
                        get() {
                            return 'Etc/UTC';
                        }
                    }
                }
            });
            const result = lastSeenAtCache._shouldClear();
            assert.equal(result, false, 'the day has not changed');
            clock.tick(24 * 60 * 60 * 1000);
            const result2 = lastSeenAtCache._shouldClear();
            assert.equal(result2, true, 'the day has changed');
        });

        it('returns true only if the day has changed in another timezone', async function () {
            const now = moment('2022-02-28T18:00:00Z').utc(); // 2022-02-28 01:00:00 in Bangkok
            clock = sinon.useFakeTimers(now.toDate());
            const lastSeenAtCache = new LastSeenAtCache({
                services: {
                    settingsCache: {
                        get() {
                            return 'Asia/Bangkok';
                        }
                    }
                }
            });
            const result = lastSeenAtCache._shouldClear();
            assert.equal(result, false, 'the day has not changed');
            clock.tick(24 * 60 * 60 * 1000);
            const result2 = lastSeenAtCache._shouldClear();
            assert.equal(result2, true, 'the day has changed');
        });
    });

    describe('_refresh', function () {
        it('clears the cache if the day has changed', async function () {
            const now = moment('2022-02-28T18:00:00Z').utc();
            clock = sinon.useFakeTimers(now.toDate());
            const lastSeenAtCache = new LastSeenAtCache({
                services: {
                    settingsCache: {
                        get() {
                            return 'Etc/UTC';
                        }
                    }
                }
            });
            const day0 = lastSeenAtCache._getStartOfCurrentDay();
            lastSeenAtCache.add('member-id');
            lastSeenAtCache._refresh();
            assert.equal(lastSeenAtCache._cache.size, 1, 'the cache should not be cleared');
            clock.tick(24 * 60 * 60 * 1000);
            const day1 = lastSeenAtCache._getStartOfCurrentDay();
            assert.notEqual(day0, day1, 'the day has changed');
            lastSeenAtCache._refresh();
            assert.equal(lastSeenAtCache._cache.size, 0, 'the cache should be cleared');
            assert.equal(lastSeenAtCache._startOfDay, day1, 'the start of the day should be updated');
        });
    });

    describe('shouldUpdateMember', function () {
        it('returns true if the member id is not in the cache', async function () {
            const lastSeenAtCache = new LastSeenAtCache({
                services: {
                    settingsCache: {
                        get() {
                            return 'Etc/UTC';
                        }
                    }
                }
            });
            assert.equal(lastSeenAtCache.shouldUpdateMember('member-id'), true, 'the member id should not be in the cache');
        });

        it('returns false if the member id is in the cache', async function () {
            const lastSeenAtCache = new LastSeenAtCache({
                services: {
                    settingsCache: {
                        get() {
                            return 'Etc/UTC';
                        }
                    }
                }
            });
            lastSeenAtCache.add('member-id');
            assert.equal(lastSeenAtCache.shouldUpdateMember('member-id'), false, 'the member id should be in the cache');
        });

        it('returns true if the day has changed', async function () {
            const now = moment('2022-02-28T18:00:00Z').utc();
            clock = sinon.useFakeTimers(now.toDate());
            const lastSeenAtCache = new LastSeenAtCache({
                services: {
                    settingsCache: {
                        get() {
                            return 'Etc/UTC';
                        }
                    }
                }
            });
            lastSeenAtCache.add('member-id');
            clock.tick(24 * 60 * 60 * 1000);
            assert.equal(lastSeenAtCache.shouldUpdateMember('member-id'), true, 'the day has changed');
        });
    });
});
