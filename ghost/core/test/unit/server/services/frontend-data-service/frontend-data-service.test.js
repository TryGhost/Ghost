const assert = require('assert');
const sinon = require('sinon');

const models = require('../../../../../core/server/models');

const FrontendDataService = require('../../../../../core/server/services/frontend-data-service/FrontendDataService');

const logging = require('@tryghost/logging');

describe('Frontend Data Service', function () {
    let service, modelStub, fakeModel;

    before(function () {
        models.init();
    });

    beforeEach(function () {
        fakeModel = {
            toJSON: () => {
                return {api_keys: [{secret: 'xyz'}]};
            }
        };

        modelStub = sinon.stub(models.Integration, 'getInternalFrontendKey');

        service = new FrontendDataService({
            IntegrationModel: models.Integration
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    it('returns null if anything goes wrong', async function () {
        modelStub.returns();
        const loggingStub = sinon.stub(logging, 'error');

        const key = await service.getFrontendKey();

        sinon.assert.calledOnce(modelStub);
        assert.equal(key, null);
        sinon.assert.calledOnce(loggingStub);
        assert.equal(loggingStub.firstCall.firstArg.message, 'Unable to find the internal frontend key');
    });

    it('returns the key from a model response', async function () {
        modelStub.returns(fakeModel);

        const key = await service.getFrontendKey();

        sinon.assert.calledOnce(modelStub);
        assert.equal(key, 'xyz');
    });

    it('returns the key from cache the second time', async function () {
        modelStub.returns(fakeModel);

        let key = await service.getFrontendKey();

        sinon.assert.calledOnce(modelStub);
        assert.equal(key, 'xyz');

        key = await service.getFrontendKey();
        sinon.assert.calledOnce(modelStub);
        assert.equal(key, 'xyz');
    });
});
