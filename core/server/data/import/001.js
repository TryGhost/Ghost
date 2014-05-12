var Importer000 = require('./000');

module.exports = {
    Importer001: Importer000,
    importData: function (data) {
        return new Importer000.importData(data);
    }
};