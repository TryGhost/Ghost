const should = require('should');
const url = require('url');
const sinon = require('sinon');
const models = require('../../../server/models');
const testUtils = require('../../utils');
const {knex} = require('../../../server/data/db');

describe('Unit: models/integration', function () {
    before(function () {
        models.init();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('permittedOptions', function () {
        let basePermittedOptionsReturnVal;
        let basePermittedOptionsStub;

        beforeEach(function () {
            basePermittedOptionsReturnVal = ['super', 'doopa'];
            basePermittedOptionsStub = sinon.stub(models.Base.Model, 'permittedOptions')
                .returns(basePermittedOptionsReturnVal);
        });

        it('returns the base permittedOptions result', function () {
            const returnedOptions = models.Integration.permittedOptions();
            should.deepEqual(returnedOptions, basePermittedOptionsReturnVal);
        });

        it('returns the base permittedOptions result plus "filter" when methodName is findOne', function () {
            const returnedOptions = models.Integration.permittedOptions('findOne');
            should.deepEqual(returnedOptions, basePermittedOptionsReturnVal.concat('filter'));
        });
    });
});
