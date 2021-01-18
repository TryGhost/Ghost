const models = require('../../../core/server/models');
const should = require('should');
const sinon = require('sinon');

let clock;
describe('Regression: models/single-use-token', function () {
    before(function () {
        models.init();
        clock = sinon.useFakeTimers();
    });

    after(function () {
        clock.restore();
    });

    describe('findOne', function () {
        it('Does not allow the same token to be read twice after the grace period', async function () {
            const insertedToken = await models.SingleUseToken.add({
                data: 'some_data'
            }, {});

            const tokenFirstRead = await models.SingleUseToken.findOne({
                token: insertedToken.get('token')
            });

            should.exist(tokenFirstRead);
            should.equal(tokenFirstRead.id, insertedToken.id);

            clock.tick(10000);

            const tokenSecondRead = await models.SingleUseToken.findOne({
                token: insertedToken.get('token')
            });

            should.not.exist(tokenSecondRead);
        });
    });
});

