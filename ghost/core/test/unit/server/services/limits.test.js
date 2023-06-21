const assert = require('assert/strict');
const sinon = require('sinon');
const rewire = require('rewire');

const limits = rewire('../../../../core/server/services/limits');
const configUtils = require('../../../utils/configUtils');
const logging = require('@tryghost/logging');

const errors = require('@tryghost/errors');

describe('Limit Service Init', function () {
    let loggerStub;
    let limitServiceStub;

    beforeEach(function () {
        loggerStub = sinon.spy(logging);
        limitServiceStub = sinon.stub();

        limits.__set__('limitService.loadLimits', limitServiceStub);

        configUtils.set({
            hostSettings: {}
        });
    });

    afterEach(async function () {
        await configUtils.restore();
        sinon.restore();
    });

    it('initiates and loads limits - minimal setup', async function () {
        limitServiceStub.returns(Promise.resolve());
        await limits.init();

        sinon.assert.notCalled(loggerStub.warn);
    });
    it('handles limit-service incorrect usage errors gracefully with a warning', async function () {
        limitServiceStub.throws(new errors.IncorrectUsageError('Incorrect limits'));

        await limits.init();

        sinon.assert.called(loggerStub.warn);
    });
    it('handles limit-service other errors with exit', async function () {
        const thrownError = new errors.InternalServerError('Something went wrong');
        limitServiceStub.throws(thrownError);

        try {
            await limits.init();
        } catch (error) {
            sinon.assert.notCalled(loggerStub.warn);
            assert.deepEqual(error, thrownError);
        }
    });
});
