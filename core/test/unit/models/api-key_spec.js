const models = require('../../../server/models');
const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../utils');

describe('Unit: models/api_key', function () {
    before(models.init);

    describe('fn: refreshSecret', function () {
        it('returns a call to edit passing a new secret', function () {
            const editStub = sinon.stub(models.ApiKey, 'edit').resolves();

            const fakeData = {
                id: 'TREVOR'
            };
            const fakeOptions = {};

            const result = models.ApiKey.refreshSecret(fakeData, fakeOptions);

            should.equal(result, editStub.returnValues[0]);
            should.equal(editStub.args[0][0].id, 'TREVOR');
            should.equal(editStub.args[0][0].secret.length, 128);
            should.equal(editStub.args[0][1], fakeOptions);

            sinon.restore();
        });
    });
});
