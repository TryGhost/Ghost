const models = require('../../../../../server/models');
const sinon = require('sinon');
const testUtils = require('../../../../utils');

const sandbox = sinon.sandbox.create();

describe('Content API Key Auth', function () {
    before(models.init);
    before(testUtils.teardown);

    afterEach(function () {
        sandbox.restore();
    });

    it('should authenticate with known+valid key');

    it('shouldn\'t authenticate with invalid/unknown key');
    it('shouldn\'t authenticate with Authorization header');
});
