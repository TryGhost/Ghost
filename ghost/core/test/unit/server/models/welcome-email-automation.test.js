const assert = require('node:assert/strict');
const sinon = require('sinon');
const models = require('../../../../core/server/models');

describe('Unit: models/welcome-email-automation', function () {
    before(function () {
        models.init();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('defaults', function () {
        it('sets default status to inactive', function () {
            const model = new models.WelcomeEmailAutomation();
            const defaults = model.defaults();

            assert.equal(defaults.status, 'inactive');
        });

        it('returns expected default values', function () {
            const model = new models.WelcomeEmailAutomation();
            const defaults = model.defaults();

            assert.ok(defaults);
            assert.equal(Object.keys(defaults).length, 1);
            assert.equal(defaults.status, 'inactive');
        });
    });
});
