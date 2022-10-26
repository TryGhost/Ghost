const sinon = require('sinon');
const testUtils = require('../../utils');
const themeService = require('../../../core/server/services/themes');
const models = require('../../../core/server/models');
const importer = require('../../../core/server/data/importer');
const {exportedBodyLatest} = require('../../utils/fixtures/export/body-generator');

const dataImporter = importer.importers[1];

const importOptions = {
    returnImportedData: true
};

describe('Importer', function () {
    before(testUtils.teardownDb);

    afterEach(testUtils.teardownDb);

    afterEach(function () {
        sinon.restore();
    });

    describe('Custom Theme Settings', function () {
        beforeEach(testUtils.setup('roles', 'owner'));

        it('does import custom theme settings', function () {
            const exportData = exportedBodyLatest().db[0];
            exportData.data.custom_theme_settings[0] =
                testUtils.DataGenerator.forKnex.createCustomThemeSetting({
                    theme: 'spectre',
                    key: 'header_typography',
                    type: 'select',
                    value: 'Serif'
                });

            exportData.data.custom_theme_settings[1] =
                testUtils.DataGenerator.forKnex.createCustomThemeSetting({
                    theme: 'spectre',
                    key: 'footer_type',
                    type: 'select',
                    value: 'Full'
                });

            return dataImporter
                .doImport(exportData, importOptions)
                .then(async function (importResult) {
                    return models.CustomThemeSetting.findAll({});
                })
                .then(function (result) {
                    const customThemeSettings = result.models.map(model => model.toJSON());
                    customThemeSettings.length.should.equal(exportData.data.custom_theme_settings.length, 'Wrong number of custom theme settings');
                });
        });
        
        it('does not call activate if current theme is not modified', function () {
            const activateStub = sinon.stub(themeService.api, 'activate');
            const exportData = exportedBodyLatest().db[0];
            exportData.data.custom_theme_settings[0] =
                testUtils.DataGenerator.forKnex.createCustomThemeSetting({
                    theme: 'spectre',
                    key: 'header_typography',
                    type: 'select',
                    value: 'serif'
                });
            return dataImporter
                .doImport(exportData, importOptions)
                .then(function (importResult) {
                    return models.CustomThemeSetting.findAll({});
                })
                .then(function (result) {
                    sinon.assert.notCalled(activateStub);
                });
        });
    });

    describe('Existing database', function () {
        beforeEach(testUtils.setup('roles', 'owner', 'custom_theme_settings'));

        it('does edit existing custom theme settings', function () {
            let exportData = exportedBodyLatest().db[0];
            exportData.data.custom_theme_settings[0] = testUtils.DataGenerator.forKnex.createCustomThemeSetting({
                theme: 'casper',
                key: 'header_typography',
                type: 'select',
                value: 'Sans-serif'
            });
            return dataImporter.doImport(exportData, importOptions)
                .then(function (importResult) {
                    return models.CustomThemeSetting.findAll({});
                })
                .then(function (result) {
                    const customThemeSettings = result.models.map(model => model.toJSON());
                    customThemeSettings.length.should.equal(testUtils.DataGenerator.Content.custom_theme_settings.length, 'Wrong number of custom theme settings');
                    customThemeSettings[0].value.should.equal(exportData.data.custom_theme_settings[0].value);
                });
        });

        it('does call activate when current theme is modified', function () {
            const activateStub = sinon.stub(themeService.api, 'activate');
            const exportData = exportedBodyLatest().db[0];

            exportData.data.custom_theme_settings[0] =
                testUtils.DataGenerator.forKnex.createCustomThemeSetting({
                    theme: 'casper',
                    key: 'header_typography',
                    type: 'select',
                    value: 'sans-serif'
                });
            return dataImporter
                .doImport(exportData, importOptions)
                .then(async function (importResult) {
                    return models.CustomThemeSetting.findAll({});
                })
                .then(function (result) {
                    sinon.assert.calledOnce(activateStub);
                });
        });
    });
});