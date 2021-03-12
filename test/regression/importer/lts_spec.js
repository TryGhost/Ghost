const testUtils = require('../../utils');
const importer = require('../../../core/server/data/importer');
const dataImporter = importer.importers[1];

const {exportedLegacyBody} = require('../../utils/fixtures/export/body-generator');

const importOptions = {
    returnImportedData: true
};

describe('Integration: Importer LTS', function () {
    beforeEach(testUtils.teardownDb);
    beforeEach(testUtils.setup('roles', 'owner', 'settings'));

    it('disallows importing LTS imports', function () {
        const exportData = exportedLegacyBody().db[0];

        return dataImporter.doImport(exportData, importOptions)
            .then(function () {
                '0'.should.eql(1, 'LTS import should fail');
            })
            .catch(function (err) {
                err.message.should.eql('Detected unsupported file structure.');
            });
    });
});
