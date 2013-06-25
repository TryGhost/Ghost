var when = require('when');

module.exports = function (version) {
    var exporter;

    try {
        exporter = require("./" + version);
    } catch (ignore) {
        // Zero effs given
    }

    if (!exporter) {
        return when.reject("No exporter found");
    }

    return exporter.exportData();
};
