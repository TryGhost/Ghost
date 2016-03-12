var Promise = require('bluebird'),
    storage = require('../../../storage'),
    ThemeImporter;

ThemeImporter = {
    type: 'theme',
    preProcess: function (importData) {
        importData.preProcessedByTheme = true;
        return importData;
    },
    doImport: function (importData) {
        var store = storage.getStorage();

        return Promise.map(importData, function (file) {
            return store.save(file, file.targetDir).then(function (result) {
                return {originalPath: file.originalPath, newPath: file.newPath, stored: result};
            });
        });
    }
};

<<<<<<< HEAD
module.exports = ThemeImporter;
=======
module.exports = ThemeImporter;
>>>>>>> 471db51... Added import theme function as an experimental feature under labs
