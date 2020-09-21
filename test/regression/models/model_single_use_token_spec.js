const models = require('../../../core/server/models');
const should = require('should');

describe('Regression: models/single-use-token', function () {
    before(function () {
        models.init();
    });

    describe('findOne', function () {
        it('Does not allow the same token to be read twice', async function () {
            const insertedToken = await models.SingleUseToken.add({
                data: 'some_data'
            }, {});

            const tokenFirstRead = await models.SingleUseToken.findOne({
                token: insertedToken.get('token')
            });

            should.exist(tokenFirstRead);
            should.equal(tokenFirstRead.id, insertedToken.id);

            const tokenSecondRead = await models.SingleUseToken.findOne({
                token: insertedToken.get('token')
            });

            should.not.exist(tokenSecondRead);
        });
    });
});

