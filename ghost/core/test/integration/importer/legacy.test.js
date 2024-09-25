const testUtils = require('../../utils');

const {exportedBodyLegacy} = require('../../utils/fixtures/export/body-generator');

const importOptions = {
    returnImportedData: true
};

describe('Importer Legacy', function () {
    let dataImporter;
    before(function () {
        const importer = require('../../../core/server/data/importer');
        dataImporter = importer.importers.find((instance) => {
            return instance.type === 'data';
        });
    });
    beforeEach(testUtils.teardownDb);
    beforeEach(testUtils.setup('roles', 'owner'));

    it('disallows importing Legacy imports', function () {
        const exportData = exportedBodyLegacy().db[0];

        return dataImporter.doImport(exportData, importOptions)
            .then(function () {
                '0'.should.eql(1, 'Legacy import should fail');
            })
            .catch(function (err) {
                err.message.should.eql('Detected unsupported file structure.');
            });
    });
});
