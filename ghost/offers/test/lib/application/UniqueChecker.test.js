const sinon = require('sinon');
const should = require('should');
const UniqueChecker = require('../../../lib/application/UniqueChecker');

describe('UniqueChecker', function () {
    describe('#isUniqueCode', function () {
        it('Returns true if there is no Offer found in the repository', async function () {
            const repository = {
                existsByCode: sinon.stub().resolves(false)
            };
            const transaction = {};

            const checker = new UniqueChecker(repository, transaction);

            const returnVal = await checker.isUniqueCode('code');

            should.equal(returnVal, true);
        });

        it('Returns false if there is an Offer found in the repository', async function () {
            const repository = {
                existsByCode: sinon.stub().resolves(true)
            };
            const transaction = {};

            const checker = new UniqueChecker(repository, transaction);

            const returnVal = await checker.isUniqueCode('code');

            should.equal(returnVal, false);
        });
    });

    describe('#isUniqueName', function () {
        it('Returns true if there is no Offer found in the repository', async function () {
            const repository = {
                existsByName: sinon.stub().resolves(false)
            };
            const transaction = {};

            const checker = new UniqueChecker(repository, transaction);

            const returnVal = await checker.isUniqueName('name');

            should.equal(returnVal, true);
        });

        it('Returns false if there is an Offer found in the repository', async function () {
            const repository = {
                existsByName: sinon.stub().resolves(true)
            };
            const transaction = {};

            const checker = new UniqueChecker(repository, transaction);

            const returnVal = await checker.isUniqueName('name');

            should.equal(returnVal, false);
        });
    });
});
