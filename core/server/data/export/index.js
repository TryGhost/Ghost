var when = require('when'),
    migration = require('../migration');

module.exports = function (version) {
    var exporter;

    if (version > migration.databaseVersion) {
        return when.reject("Your data version is ahead of the current Ghost version. Please upgrade in order to export.");
    }

    try {
        exporter = require("./" + version);
    } catch (ignore) {
        // Zero effs given
    }

    if (!exporter) {
        return when.reject("No exporter found for data version " + version);
    }

    return exporter.exportData();
};
