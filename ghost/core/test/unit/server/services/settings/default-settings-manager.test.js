const sinon = require('sinon');
const should = require('should');
const fs = require('fs-extra');
const path = require('path');
const DefaultSettingsManager = require('../../../../../core/server/services/route-settings/DefaultSettingsManager');

describe('UNIT > Settings Service DefaultSettingsManager:', function () {
    let fsReadFileStub;
    let fsCopyStub;

    beforeEach(function () {
        fsReadFileStub = sinon.stub(fs, 'readFile');
        fsCopyStub = sinon.stub(fs, 'copy');
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('Ensure settings files', function () {
        it('returns yaml file from settings folder if it exists', async function () {
            fsReadFileStub.withArgs(path.join(__dirname, '../../../../utils/fixtures/settings/routes.yaml'), 'utf8').resolves('content');

            const defaultSettingsManager = new DefaultSettingsManager({
                type: 'routes',
                extension: '.yaml',
                destinationFolderPath: path.join(__dirname, '../../../../utils/fixtures/settings/'),
                sourceFolderPath: ''
            });

            await defaultSettingsManager.ensureSettingsFileExists();

            // Assert did not attempt to copy the default config
            fsCopyStub.called.should.be.false();
        });

        it('copies default settings file if no file found', async function () {
            const destinationFolderPath = path.join(__dirname, '../../../../utils/fixtures/settings/');
            const sourceFolderPath = path.join(__dirname, '../../../../../core/server/services/route-settings/');

            const defaultSettingsManager = new DefaultSettingsManager({
                type: 'routes',
                extension: '.yaml',
                destinationFolderPath: destinationFolderPath,
                sourceFolderPath: sourceFolderPath
            });

            const fsError = new Error('not found');
            fsError.code = 'ENOENT';

            const settingsDestinationPath = path.join(destinationFolderPath, 'routes.yaml');
            fsReadFileStub.withArgs(settingsDestinationPath, 'utf8').rejects(fsError);
            fsCopyStub.withArgs(path.join(sourceFolderPath, 'default-routes.yaml'), settingsDestinationPath).resolves();

            await defaultSettingsManager.ensureSettingsFileExists();

            // Assert attempt to copy the default config
            fsCopyStub.calledOnce.should.be.true();
        });

        it('rejects, if error is not a not found error', async function () {
            const destinationFolderPath = path.join(__dirname, '../../../../utils/fixtures/settings/');

            const defaultSettingsManager = new DefaultSettingsManager({
                type: 'routes',
                extension: '.yaml',
                destinationFolderPath: destinationFolderPath,
                sourceFolderPath: ''
            });

            const fsError = new Error('no permission');
            fsError.code = 'EPERM';

            fsReadFileStub.withArgs(path.join(destinationFolderPath, 'routes.yaml'), 'utf8').rejects(fsError);

            try {
                await defaultSettingsManager.ensureSettingsFileExists();
                throw new Error('Expected test to fail');
            } catch (error) {
                should.exist(error);
                error.message.should.be.eql(`Error trying to access settings files in ${destinationFolderPath}.`);
                fsReadFileStub.calledOnce.should.be.true();
                fsCopyStub.called.should.be.false();
            }
        });
    });
});
