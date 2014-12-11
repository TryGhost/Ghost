var importer = require('../../import'),
    DataImporter;

DataImporter = {
    type: 'data',
    preProcess: function (importData) {
        importData.preProcessedByData = true;
        return importData;
    },
    doImport: function (importData) {
        return importer(importData);
    }
};

module.exports = DataImporter;
