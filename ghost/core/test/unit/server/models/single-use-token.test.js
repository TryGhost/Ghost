const models = require('../../../../core/server/models');
const should = require('should');
const sinon = require('sinon');
const assert = require('assert/strict');

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
    });
});
