var when = require("when"),
    _ = require("underscore"),
    knex = require('../../models/base').Knex,
    Importer001;

Importer001 = function () {
    _.bindAll(this, "importFrom001");

    this.version = "001";

    this.importFrom = {
        "001": this.importFrom001
    };
};

Importer001.prototype.importData = function (data) {
    return this.canImport(data)
        .then(function (importerFunc) {
            return importerFunc(data);
        }, function (reason) {
            return when.reject(reason);
        });
};

Importer001.prototype.canImport = function (data) {
    if (data.meta && data.meta.version && this.importFrom[data.meta.version]) {
        return when.resolve(this.importFrom[data.meta.version]);
    }

    return when.reject("Unsupported version of data");
};

Importer001.prototype.importFrom001 = function (data) {
    var insertOps = [];

    _.each(data.data, function (tableData, name) {
        if (tableData && tableData.length) {
            insertOps.push(knex(name).insert(tableData));
        }
    });

    return when.all(insertOps).then(function (results) {
        return when.resolve(results);
    }, function (err) {
        console.log("Error inserting imported data: ", err.message || err, err.stack);
    });
};

module.exports = {
    Importer001: Importer001,
    importData: function (data) {
        new Importer001().importData(data);
    }
};