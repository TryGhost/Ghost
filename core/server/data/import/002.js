var Importer000 = require('./000');

module.exports = {
    Importer002: Importer000,
    importData: function (data) {
        return new Importer000.importData(data);
    }
};