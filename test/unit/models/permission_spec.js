const should = require('should'),
    sinon = require('sinon'),
    models = require('../../../core/server/models'),
    testUtils = require('../../utils'),
    configUtils = require('../../utils/configUtils');

describe('Unit: models/permission', function () {
    before(function () {
        models.init();
    });

    after(function () {
        sinon.restore();
        configUtils.restore();
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
