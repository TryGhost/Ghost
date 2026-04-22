const models = require('../../../../core/server/models');
const sinon = require('sinon');
const assert = require('node:assert/strict');
const {assertExists} = require('../../../utils/assertions');
const validator = require('validator');

let clock;
let sandbox;

describe('Unit: models/single-use-token', function () {
    before(function () {
        models.init();
        sandbox = sinon.createSandbox();
        clock = sandbox.useFakeTimers();
    });

    after(function () {
        clock.restore();
        sandbox.restore();
    });

    describe('fn: defaults', function () {
        it('Defaults to used_count of zero', async function () {
            const model = new models.SingleUseToken();
            const defaults = model.defaults();
            assert.equal(defaults.used_count, 0);
        });

        it('Generates a valid v4 UUID by default', async function () {
            const model = new models.SingleUseToken();
            const defaults = model.defaults();

            assertExists(defaults.uuid);
            assert.equal(validator.isUUID(defaults.uuid, 4), true, 'Generated UUID should be a valid v4 UUID');
        });

        it('Generates unique UUIDs for different instances', async function () {
            const model1 = new models.SingleUseToken();
            const model2 = new models.SingleUseToken();

            const defaults1 = model1.defaults();
            const defaults2 = model2.defaults();

            assertExists(defaults1.uuid);
            assertExists(defaults2.uuid);
            assert.notEqual(defaults1.uuid, defaults2.uuid, 'Each instance should generate a unique UUID');
        });
    });
});
