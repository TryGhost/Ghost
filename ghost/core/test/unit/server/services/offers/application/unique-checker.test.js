const assert = require('node:assert/strict');
const sinon = require('sinon');
const UniqueChecker = require('../../../../../../core/server/services/offers/application/unique-checker');

describe('UniqueChecker', function () {
    describe('#isUniqueCode', function () {
        it('Returns true if there is no Offer found in the repository', async function () {
            const repository = {
                existsByCode: sinon.stub().resolves(false)
            };
            const transaction = {};

            const checker = new UniqueChecker(repository, transaction);

            const returnVal = await checker.isUniqueCode('code');

            assert.equal(returnVal, true);
        });

        it('Returns false if there is an Offer found in the repository', async function () {
            const repository = {
                existsByCode: sinon.stub().resolves(true)
            };
            const transaction = {};

            const checker = new UniqueChecker(repository, transaction);

            const returnVal = await checker.isUniqueCode('code');

            assert.equal(returnVal, false);
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

            assert.equal(returnVal, true);
        });

        it('Returns false if there is an Offer found in the repository', async function () {
            const repository = {
                existsByName: sinon.stub().resolves(true)
            };
            const transaction = {};

            const checker = new UniqueChecker(repository, transaction);

            const returnVal = await checker.isUniqueName('name');

            assert.equal(returnVal, false);
        });
    });
});
