var when = require('when');

module.exports = function (version, data) {
    var importer;

    try {
        importer = require("./" + version);
    } catch (ignore) {
        // Zero effs given
    }

    if (!importer) {
        return when.reject("No importer found");
    }

    return importer.importData(data);
};
