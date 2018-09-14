const models = require('../../../../server/models');
const sinon = require('sinon');
const testUtils = require('../../../utils');

const sandbox = sinon.sandbox.create();

describe('Admin API Key Auth', function () {
    before(models.init);
    before(testUtils.teardown);

    afterEach(function () {
        sandbox.restore();
    });

    it('should authenticate known+valid API key');

    it('shouldn\'t authenticate with broken brearer token');
    it('shouldn\'t authenticate with invalid/unknown key');
    it('shouldn\'t authenticate with content_key query param');
    it('shouldn\'t authenticate with JWT expiry > 5min');
});
