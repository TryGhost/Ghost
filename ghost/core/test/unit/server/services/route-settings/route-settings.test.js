const assert = require('node:assert/strict');
const sinon = require('sinon');
const fs = require('fs-extra');
const path = require('path');
const bridge = require('../../../../../core/bridge');
const RouteSettings = require('../../../../../core/server/services/route-settings/route-settings');

describe('UNIT > Settings Service DefaultSettingsManager:', function () {
    let fsReadFileStub;
    let fsCopyStub;
    let bridgeReloadFrontendStub;

    beforeEach(function () {
        fsReadFileStub = sinon.stub(fs, 'readFile');
        sinon.stub(fs, 'readFileSync');
        fsCopyStub = sinon.stub(fs, 'copy');
        bridgeReloadFrontendStub = sinon.stub(bridge, 'reloadFrontend');
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('setFromFilePath', function () {
        it('catches parsing error when setFromFilePath', async function () {
            const routesSettingsPath = path.join(__dirname, '../../../../utils/fixtures/settings/routes.yaml');
            const backupFilePath = path.join(__dirname, '../../../../utils/fixtures/settings/routes-backup.yaml');
            const incomingSettingsPath = path.join(__dirname, '../../../../utils/fixtures/settings/routes-incoming.yaml');

            fsReadFileStub.withArgs(routesSettingsPath, 'utf8').resolves('content');
            fsCopyStub.withArgs(backupFilePath, routesSettingsPath).resolves();
            fsCopyStub.withArgs(incomingSettingsPath, routesSettingsPath).resolves();

            // simulate a parsing error during frontend reload
            bridgeReloadFrontendStub.throws(new Error('YAMLException: bad indentation of a mapping entry'));

            const defaultSettingsManager = new RouteSettings({
                settingsLoader: {},
                settingsPath: routesSettingsPath,
                backupPath: backupFilePath
            });

            try {
                await defaultSettingsManager.setFromFilePath(incomingSettingsPath);
                assert.fail();
            } catch (error) {
                assert.match(error.message, /YAMLException: bad indentation of a mapping entry/);
            }
        });
    });
});
