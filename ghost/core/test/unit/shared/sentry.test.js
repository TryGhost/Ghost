const assert = require('assert/strict');
const sinon = require('sinon');
const configUtils = require('../../utils/configUtils');

const Sentry = require('@sentry/node');

const fakeDSN = 'https://aaabbbccc000111222333444555667@sentry.io/1234567';
let sentry;

describe('UNIT: sentry', function () {
    afterEach(async function () {
        await configUtils.restore();
        sinon.restore();
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
    });
});
