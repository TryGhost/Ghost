const sinon = require('sinon');
const membersController = require('../../../../core/server/api/endpoints/members');
const membersService = require('../../../../core/server/services/members');

describe('Members controller', function () {
    let processImportStub;
    let originalProcessImport;

    beforeEach(function () {
        originalProcessImport = membersService.processImport;
        processImportStub = sinon.stub().resolves({
            meta: {stats: {imported: 1}}
        });
        membersService.processImport = processImportStub;
    });

    afterEach(function () {
        membersService.processImport = originalProcessImport;
        sinon.restore();
    });

    describe('importCSV', function () {
        // The endpoint is a thin adapter: it hands the whole request frame to the import
        // service, which owns reading the CSV and resolving who to email (the request
        // user, falling back to the site owner). That recipient resolution now lives in
        // the import service and is exercised by the deferred import e2e, not here.
        it('hands the request frame to the import service', async function () {
            const frame = {
                user: {get: sinon.stub().returns('user@example.com')},
                file: {path: 'test.csv'},
                data: {mapping: {}, labels: []}
            };

            await membersController.importCSV.query(frame);

            sinon.assert.calledOnceWithExactly(processImportStub, frame);
        });
    });
});
