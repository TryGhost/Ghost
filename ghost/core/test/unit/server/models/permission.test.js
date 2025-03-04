const should = require('should');
const sinon = require('sinon');
const models = require('../../../../core/server/models');
const configUtils = require('../../../utils/configUtils');

describe('Unit: models/permission', function () {
    before(function () {
        models.init();
    });

    after(async function () {
        sinon.restore();
        await configUtils.restore();
    });

    describe('add', function () {
        it('[error] validation', function () {
            return models.Permission.add({})
                .then(function () {
                    'Should fail'.should.be.true();
                })
                .catch(function (err) {
                    err.length.should.eql(3);
                });
        });
    });
});
