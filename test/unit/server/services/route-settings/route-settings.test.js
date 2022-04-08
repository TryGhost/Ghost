const sinon = require('sinon');
const should = require('should');
const fs = require('fs-extra');
const path = require('path');
const bridge = require('../../../../../core/bridge');
const RouteSettings = require('../../../../../core/server/services/route-settings/route-settings');

describe('UNIT > Settings Service DefaultSettingsManager:', function () {
    beforeEach(function () {
        sinon.stub(fs, 'readFile');
        sinon.stub(fs, 'readFileSync');
        sinon.stub(fs, 'copy');
        sinon.stub(bridge, 'reloadFrontend');
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('setFromFilePath', function () {
        it('catches parsing error when setFromFilePath', async function () {
            const routesSettingsPath = path.join(__dirname, '../../../../utils/fixtures/settings/routes.yaml');
            const backupFilePath = path.join(__dirname, '../../../../utils/fixtures/settings/routes-backup.yaml');
            const incomingSettingsPath = path.join(__dirname, '../../../../utils/fixtures/settings/routes-incoming.yaml');

            fs.readFile.withArgs(routesSettingsPath, 'utf8').resolves('content');
            fs.copy.withArgs(backupFilePath, routesSettingsPath).resolves();
            fs.copy.withArgs(incomingSettingsPath, routesSettingsPath).resolves();

            // simulate a parsing error during frontend reload
            bridge.reloadFrontend.throws(new Error('YAMLException: bad indentation of a mapping entry'));

            const defaultSettingsManager = new RouteSettings({
                settingsLoader: {},
                settingsPath: routesSettingsPath,
                backupPath: backupFilePath
            });

            try {
                await defaultSettingsManager.setFromFilePath(incomingSettingsPath);
                should.fail('should.fail');
            } catch (error) {
                error.message.should.match(/YAMLException: bad indentation of a mapping entry/);
            }
        });
    });
});
