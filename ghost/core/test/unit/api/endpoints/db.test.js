const sinon = require('sinon');
const models = require('../../../../core/server/models');
const dbController = require('../../../../core/server/api/endpoints/db');

describe('DB controller', function () {
    let settingsCache, importer;

    before(function () {
        models.init();
    });

    beforeEach(function () {
        settingsCache = require('../../../../core/shared/settings-cache');
        importer = require('../../../../core/server/data/importer');

        sinon.stub(settingsCache, 'get').withArgs('timezone').returns('UTC');
        sinon.stub(importer, 'importFromFile').resolves({
            db: [{data: {}}],
            problems: []
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('importContent', function () {
        it('uses frame.user.email when frame.user is present', async function () {
            const mockUser = {
                get: sinon.stub().returns('user@example.com')
            };
            const frame = {
                user: mockUser,
                file: {path: 'test.json'}
            };

            await dbController.importContent.query(frame);

            // Verify the user's email was used
            sinon.assert.calledWith(mockUser.get, 'email');
            sinon.assert.calledWith(importer.importFromFile, frame.file, sinon.match({
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
                file: {path: 'test.json'}
            };

            await dbController.importContent.query(frame);

            // Verify the owner fallback path was used
            sinon.assert.calledOnce(models.User.getOwnerUser);
            sinon.assert.calledWith(mockOwnerUser.get, 'email');
            sinon.assert.calledWith(importer.importFromFile, frame.file, sinon.match({
                user: {email: 'owner@example.com'}
            }));
        });
    });
});
