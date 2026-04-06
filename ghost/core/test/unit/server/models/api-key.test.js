const assert = require('node:assert/strict');
const models = require('../../../../core/server/models');
const sinon = require('sinon');

describe('Unit: models/api_key', function () {
    before(models.init);

    describe('fn: refreshSecret', function () {
        it('returns a call to edit passing a new admin secret', function () {
            const editStub = sinon.stub(models.ApiKey, 'edit').resolves();

            const fakeData = {
                id: 'TREVOR',
                type: 'admin'
            };
            const fakeOptions = {};

            const result = models.ApiKey.refreshSecret(fakeData, fakeOptions);

            assert.equal(result, editStub.returnValues[0]);
            assert.equal(editStub.args[0][0].id, 'TREVOR');
            assert.equal(editStub.args[0][0].secret.length, 64);
            assert.equal(editStub.args[0][1], fakeOptions);

            sinon.restore();
        });

        it('returns a call to edit passing a new content secret', function () {
            const editStub = sinon.stub(models.ApiKey, 'edit').resolves();

            const fakeData = {
                id: 'TREVOR',
                type: 'content'
            };
            const fakeOptions = {};

            const result = models.ApiKey.refreshSecret(fakeData, fakeOptions);

            assert.equal(result, editStub.returnValues[0]);
            assert.equal(editStub.args[0][0].id, 'TREVOR');
            assert.equal(editStub.args[0][0].secret.length, 26);
            assert.equal(editStub.args[0][1], fakeOptions);

            sinon.restore();
        });
    });
});
