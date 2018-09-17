const models = require('../../../../../server/models');
const sinon = require('sinon');
const testUtils = require('../../../../utils');

const sandbox = sinon.sandbox.create();

describe('API Key Auth', function () {
    before(models.init);
    before(testUtils.teardown);

    afterEach(function () {
        sandbox.restore();
    });

    describe('with Admin key', function () {
        it('shouldn\'t authenticate with broken brearer token');
        it('shouldn\'t authenticate with invalid/unknown key');
        it('shouldn\'t authenticate with content_key query param');

        it('should authenticate known+valid API key');
    });

    describe('with Content Key', function () {
        it('shouldn\'t authenticate with invalid/unknown key');
        it('shouldn\'t authenticate with Authorization header');

        it('should authenticate with known+valid key');
    });
});
