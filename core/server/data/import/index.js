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

    return importer.importData(data).otherwise(function (err) {
        if (err === "Unsupported version of data: 001" || err === "Unsupported version of data: 002") {
            try {
                importer = require("./temp.js");
            } catch (ignore) {
                // Zero effs given
            }

            if (!importer) {
                return when.reject("No importer found");
            }

            return importer.importData(data);
        }
    });
};
