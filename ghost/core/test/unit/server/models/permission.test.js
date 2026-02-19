const assert = require('node:assert/strict');
const sinon = require('sinon');
const models = require('../../../../core/server/models');
const configUtils = require('../../../utils/config-utils');

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
                    assert.equal('Should fail', true);
                })
                .catch(function (err) {
                    assert.equal(err.length, 3);
                });
        });
    });
});
