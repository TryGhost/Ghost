const assert = require('node:assert/strict');
const sinon = require('sinon');
const fs = require('fs-extra');
const path = require('path');
const bridge = require('../../../../../core/bridge');
const RouteSettings = require('../../../../../core/server/services/route-settings/route-settings');
const urlService = require('../../../../../core/server/services/url');

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

        // Lazy/eager branching for the URL-service reset and the post-reload
        // readiness poll. The lazy branch is unique to this commit (HKG-1771),
        // so the test is colocated with the implementation.
        describe('when lazyRouting is on', function () {
            const routesSettingsPath = path.join(__dirname, '../../../../utils/fixtures/settings/routes.yaml');
            const backupFilePath = path.join(__dirname, '../../../../utils/fixtures/settings/routes-backup.yaml');
            const incomingSettingsPath = path.join(__dirname, '../../../../utils/fixtures/settings/routes-incoming.yaml');

            let facadeResetStub;
            let resetGeneratorsStub;
            let hasFinishedStub;

            beforeEach(function () {
                sinon.stub(urlService.facade, 'isLazy').returns(true);
                facadeResetStub = sinon.stub(urlService.facade, 'reset');
                resetGeneratorsStub = sinon.stub(urlService, 'resetGenerators');
                hasFinishedStub = sinon.stub(urlService, 'hasFinished').returns(true);

                fsReadFileStub.withArgs(routesSettingsPath, 'utf8').resolves('content');
                fsCopyStub.withArgs(backupFilePath, routesSettingsPath).resolves();
                fsCopyStub.withArgs(incomingSettingsPath, routesSettingsPath).resolves();

                bridgeReloadFrontendStub.resolves();
            });

            it('resets via facade.reset and skips eager resetGenerators', async function () {
                const manager = new RouteSettings({
                    settingsLoader: {},
                    settingsPath: routesSettingsPath,
                    backupPath: backupFilePath
                });

                await manager.setFromFilePath(incomingSettingsPath);

                sinon.assert.calledOnce(facadeResetStub);
                sinon.assert.notCalled(resetGeneratorsStub);
            });

            it('skips the readiness poll', async function () {
                const manager = new RouteSettings({
                    settingsLoader: {},
                    settingsPath: routesSettingsPath,
                    backupPath: backupFilePath
                });

                await manager.setFromFilePath(incomingSettingsPath);

                // The readiness loop is the only caller of
                // urlService.hasFinished() inside setFromFilePath. When the
                // flag is on, the lazy short-circuit returns early — so it
                // must never be consulted.
                sinon.assert.notCalled(hasFinishedStub);
            });
        });

        describe('when lazyRouting is off (eager default)', function () {
            const routesSettingsPath = path.join(__dirname, '../../../../utils/fixtures/settings/routes.yaml');
            const backupFilePath = path.join(__dirname, '../../../../utils/fixtures/settings/routes-backup.yaml');
            const incomingSettingsPath = path.join(__dirname, '../../../../utils/fixtures/settings/routes-incoming.yaml');

            let facadeResetStub;
            let resetGeneratorsStub;

            beforeEach(function () {
                sinon.stub(urlService.facade, 'isLazy').returns(false);
                facadeResetStub = sinon.stub(urlService.facade, 'reset');
                resetGeneratorsStub = sinon.stub(urlService, 'resetGenerators');
                sinon.stub(urlService, 'hasFinished').returns(true);

                fsReadFileStub.withArgs(routesSettingsPath, 'utf8').resolves('content');
                fsCopyStub.withArgs(backupFilePath, routesSettingsPath).resolves();
                fsCopyStub.withArgs(incomingSettingsPath, routesSettingsPath).resolves();

                bridgeReloadFrontendStub.resolves();
            });

            it('keeps the existing eager resetGenerators path', async function () {
                const manager = new RouteSettings({
                    settingsLoader: {},
                    settingsPath: routesSettingsPath,
                    backupPath: backupFilePath
                });

                await manager.setFromFilePath(incomingSettingsPath);

                sinon.assert.called(resetGeneratorsStub);
                sinon.assert.notCalled(facadeResetStub);
            });
        });
    });
});
