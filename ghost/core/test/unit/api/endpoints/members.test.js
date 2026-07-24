const sinon = require('sinon');
const assert = require('node:assert/strict');
const membersController = require('../../../../core/server/api/endpoints/members');
const membersService = require('../../../../core/server/services/members');

describe('Members controller', function () {
    let importCSVStub;
    let originalImportCSV;

    beforeEach(function () {
        originalImportCSV = membersService.importCSV;
        importCSVStub = sinon.stub().resolves({deferred: true, originalImportSize: 2});
        membersService.importCSV = importCSVStub;
    });

    afterEach(function () {
        membersService.importCSV = originalImportCSV;
        sinon.restore();
    });

    describe('importCSV', function () {
        // The endpoint adapts the request frame into the import service's arguments and
        // shapes the outcome into the response envelope. The recipient is the request
        // user; the service resolves the owner fallback, so the endpoint only reads the
        // user's email (or null).
        it('adapts the request frame into the import service arguments', async function () {
            const frame = {
                user: {get: sinon.stub().returns('user@example.com')},
                file: {path: 'test.csv'},
                data: {mapping: {email: 'email'}, labels: [{name: 'x'}]}
            };

            await membersController.importCSV.query(frame);

            sinon.assert.calledOnceWithExactly(importCSVStub, {
                filePath: 'test.csv',
                mapping: {email: 'email'},
                extraLabels: [{name: 'x'}],
                requestUserEmail: 'user@example.com'
            });
        });

        it('passes a null recipient when the request has no user', async function () {
            await membersController.importCSV.query({user: null, file: {path: 'test.csv'}, data: {}});

            const args = importCSVStub.getCall(0).args[0];
            assert.equal(args.requestUserEmail, null);
            assert.deepEqual(args.extraLabels, []);
        });

        it('shapes an inline outcome into stats and label', async function () {
            importCSVStub.resolves({
                deferred: false,
                originalImportSize: 2,
                result: {imported: 2, errors: [], importLabel: {name: 'Import', slug: 'import'}}
            });

            const response = await membersController.importCSV.query({file: {path: 't.csv'}, data: {}});

            assert.equal(response.meta.originalImportSize, 2);
            assert.deepEqual(response.meta.stats, {imported: 2, invalid: []});
            assert.deepEqual(response.meta.import_label, {name: 'Import', slug: 'import'});
        });

        it('shapes a deferred outcome into just the accepted size', async function () {
            importCSVStub.resolves({deferred: true, originalImportSize: 5000});

            const response = await membersController.importCSV.query({file: {path: 't.csv'}, data: {}});

            assert.deepEqual(response.meta, {originalImportSize: 5000});
        });
    });
});
