const sinon = require('sinon');
const membersController = require('../../../../core/server/api/endpoints/members');
const membersService = require('../../../../core/server/services/members');
const settingsCache = require('../../../../core/shared/settings-cache');

describe('Members controller', function () {
    let models;
    let processImportStub;
    let originalProcessImport;

    beforeAll(function () {
        models = require('../../../../core/server/models');
    });

    beforeEach(function () {
        originalProcessImport = membersService.processImport;
        processImportStub = sinon.stub().resolves({
            meta: {stats: {imported: 1}}
        });
        membersService.processImport = processImportStub;

        sinon.stub(settingsCache, 'get').withArgs('timezone').returns('UTC');
    });

    afterEach(function () {
        membersService.processImport = originalProcessImport;
        sinon.restore();
    });

    describe('importCSV', function () {
        it('uses frame.user.email when frame.user is present', async function () {
            const mockUser = {
                get: sinon.stub().returns('user@example.com')
            };
            const frame = {
                user: mockUser,
                file: {path: 'test.csv'},
                data: {mapping: {}, labels: []}
            };

            await membersController.importCSV.query(frame);

            // Verify the user's email was used
            sinon.assert.calledWith(mockUser.get, 'email');
            sinon.assert.calledWith(processImportStub, sinon.match({
                user: {email: 'user@example.com'}
            }));
        });

        it('uses owner email fallback when frame.user is missing', async function () {
            const mockOwnerUser = {
                get: sinon.stub().returns('owner@example.com')
            };
            sinon.stub(models.User, 'getOwnerUser').resolves(mockOwnerUser);

            const frame = {
                user: null, // No user in frame (integration auth scenario)
                file: {path: 'test.csv'},
                data: {mapping: {}, labels: []}
            };

            await membersController.importCSV.query(frame);

            // Verify the owner fallback path was used
            sinon.assert.calledOnce(models.User.getOwnerUser);
            sinon.assert.calledWith(mockOwnerUser.get, 'email');
            sinon.assert.calledWith(processImportStub, sinon.match({
                user: {email: 'owner@example.com'}
            }));
        });
    });
});
