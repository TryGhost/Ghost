const assert = require('node:assert/strict');
const sinon = require('sinon');
const {Permission} = require('../../../../core/server/models/permission');
const configUtils = require('../../../utils/config-utils');

describe('Unit: models/permission', function () {
    afterAll(async function () {
        sinon.restore();
        await configUtils.restore();
    });

    describe('add', function () {
        it('[error] validation', function () {
            return Permission.add({})
                .then(function () {
                    assert.equal('Should fail', true);
                })
                .catch(function (err) {
                    assert.equal(err.length, 3);
                });
        });
    });
});
