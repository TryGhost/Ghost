var importer = require('../../import'),
    DataImporter;

DataImporter = {
    type: 'data',
    preProcess: function (importData) {
        importData.preProcessedByData = true;
        return importData;
    },
    doImport: function (importData) {
        return importer('003', importData);
    }
};

module.exports = DataImporter;
