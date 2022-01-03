const models = require('../../../../core/server/models');
const should = require('should');
const sinon = require('sinon');

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

    describe('fn: findOne', function () {
        it('Calls destroy after the grace period', async function () {
            const data = {};
            const options = {};
            const fakeModel = {
                id: 'fake_id'
            };

            const findOneSuperStub = sandbox.stub(models.Base.Model, 'findOne').resolves(fakeModel);
            const destroyStub = sandbox.stub(models.SingleUseToken, 'destroy').resolves();

            await models.SingleUseToken.findOne(data, options);

            should.ok(findOneSuperStub.calledWith(data, options), 'super.findOne was called');

            clock.tick(10000);

            should.ok(!destroyStub.called, 'destroy was not called after 10 seconds');

            clock.tick(10 * 60 * 1000 - 10000);

            should.ok(destroyStub.called, 'destroy was not called after 10 seconds');
        });
    });
});
