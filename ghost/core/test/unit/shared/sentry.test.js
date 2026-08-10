const assert = require('node:assert/strict');
const sinon = require('sinon');
const configUtils = require('../../utils/config-utils');
const errors = require('@tryghost/errors');

const Sentry = require('@sentry/node');

const fakeDSN = 'https://aaabbbccc000111222333444555667@sentry.io/1234567';
let sentry;

// These tests deliberately bust core/shared/sentry out of the require cache and
// re-require it under different configs. Under the unit suite's shared module
// registry (isolate: false) that swaps the singleton other already-loaded
// modules hold a reference to, so callers like the theme-upload reporter end up
// invoking a different sentry instance than a co-scheduled test stubbed. Snapshot
// the original cached module and put it back after each test so the registry is
// left exactly as we found it.
const sentryModulePath = require.resolve('../../../core/shared/sentry');
const originalSentryModule = require.cache[sentryModulePath];

describe('UNIT: sentry', function () {
    afterEach(async function () {
        await configUtils.restore();
        sinon.restore();
        if (originalSentryModule) {
            require.cache[sentryModulePath] = originalSentryModule;
        } else {
            delete require.cache[sentryModulePath];
        }
    });

    describe('No sentry config', function () {
        beforeEach(function () {
            delete require.cache[require.resolve('../../../core/shared/sentry')];
            sentry = require('../../../core/shared/sentry');
        });

        it('returns expected function signature', function () {
            assert.equal(sentry.requestHandler.name, 'expressNoop', 'Should return noop');
            assert.equal(sentry.errorHandler.name, 'expressNoop', 'Should return noop');
            assert.equal(sentry.captureException.name, 'noop', 'Should return noop');
            assert.equal(sentry.captureMessage.name, 'noop', 'Should return noop');
        });
    });

    describe('With sentry config', function () {
        beforeEach(function () {
            configUtils.set({sentry: {disabled: false, dsn: fakeDSN}});
            delete require.cache[require.resolve('../../../core/shared/sentry')];

            sinon.spy(Sentry, 'init');

            sentry = require('../../../core/shared/sentry');
        });

        it('returns expected function signature', function () {
            assert.equal(sentry.requestHandler.name, 'sentryRequestMiddleware', 'Should return sentry');
            assert.equal(sentry.errorHandler.name, 'sentryErrorMiddleware', 'Should return sentry');
            assert.equal(sentry.captureException.name, 'captureException', 'Should return sentry');
        });

        it('initialises sentry correctly', function () {
            const initArgs = Sentry.init.getCall(0).args;

            assert.equal(initArgs[0].dsn, fakeDSN, 'shoudl be our fake dsn');
            assert.match(initArgs[0].release, /ghost@\d+\.\d+\.\d+/, 'should be a valid version');
            assert.equal(initArgs[0].environment, 'testing', 'should be the testing env');
            assert.ok(initArgs[0].hasOwnProperty('beforeSend'), 'should have a beforeSend function');
        });

        it('initialises sentry with the correct environment', function () {
            const env = 'staging';

            configUtils.set({
                PRO_ENV: env
            });

            delete require.cache[require.resolve('../../../core/shared/sentry')];
            require('../../../core/shared/sentry');

            const initArgs = Sentry.init.getCall(1).args;

            assert.equal(initArgs[0].environment, env, 'should be the correct env');
        });
    });

    describe('beforeSend', function () {
        beforeEach(function () {
            configUtils.set({sentry: {disabled: false, dsn: fakeDSN}});
            delete require.cache[require.resolve('../../../core/shared/sentry')];

            sentry = require('../../../core/shared/sentry');
        });

        it('returns the event', function () {
            sinon.stub(errors.utils, 'isGhostError').returns(false);
            const beforeSend = sentry.beforeSend;
            const event = {tags: {}};
            const hint = {};

            const result = beforeSend(event, hint);

            assert.deepEqual(result, event);
        });

        it('returns the event, even if an exception is thrown internally', function () {
            // Trigger an internal exception
            sinon.stub(errors.utils, 'isGhostError').throws(new Error('test'));
            const beforeSend = sentry.beforeSend;
            const event = {tags: {}};
            const hint = {};

            const result = beforeSend(event, hint);

            assert.deepEqual(result, event);
        });

        it('sets sql context for mysql2 errors', function () {
            sinon.stub(errors.utils, 'isGhostError').returns(true);
            const beforeSend = sentry.beforeSend;
            const event = {
                tags: {},
                exception: {
                    values: [{
                        value: 'test',
                        type: 'test'
                    }]
                }
            };
            const exception = {
                sql: 'SELECT * FROM test',
                errno: 123,
                sqlErrorCode: 456,
                sqlMessage: 'test message',
                sqlState: 'test state',
                code: 'UNEXPECTED_ERROR',
                errorType: 'InternalServerError',
                id: 'a1b2c3d4e5f6',
                statusCode: 500
            };
            const hint = {
                originalException: exception
            };

            const result = beforeSend(event, hint);

            const expected = {
                tags: {
                    type: 'InternalServerError',
                    code: 'UNEXPECTED_ERROR',
                    id: 'a1b2c3d4e5f6',
                    status_code: 500
                },
                exception: {
                    values: [{
                        value: 'test message',
                        type: 'SQL Error 123: 456'
                    }]
                },
                contexts: {
                    mysql: {
                        errno: 123,
                        code: 456,
                        sql: 'SELECT * FROM test',
                        message: 'test message',
                        state: 'test state'
                    }
                }
            };

            assert.deepEqual(result, expected);
        });
    });

    describe('beforeSendTransaction', function () {
        beforeEach(function () {
            // beforeSendTransaction is only exported when sentry is enabled, so
            // configure a DSN and re-require rather than relying on a previous
            // test having left a configured instance in the require cache.
            configUtils.set({sentry: {disabled: false, dsn: fakeDSN}});
            delete require.cache[require.resolve('../../../core/shared/sentry')];

            sentry = require('../../../core/shared/sentry');
        });

        it('filters transactions based on an allow list', function () {
            const beforeSendTransaction = sentry.beforeSendTransaction;

            const allowedTransactions = [
                {transaction: 'GET /ghost/api/settings'},
                {transaction: 'PUT /members/api/member'},
                {transaction: 'POST /ghost/api/tiers'},
                {transaction: 'DELETE /members/api/member'},
                {transaction: 'GET /'},
                {transaction: 'GET /:slug/options(edit)?/'},
                {transaction: 'GET /author/:slug'},
                {transaction: 'GET /tag/:slug'}
            ];

            allowedTransactions.forEach((transaction) => {
                assert.equal(beforeSendTransaction(transaction), transaction);
            });

            assert.equal(beforeSendTransaction({transaction: 'GET /foo/bar'}), null);
            assert.equal(beforeSendTransaction({transaction: 'Some other transaction'}), null);
        });
    });
});
