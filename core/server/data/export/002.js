var _ = require("underscore"),
    when = require("when"),
    knex = require('../../models/base').Knex,
    Exporter002;

Exporter002 = function () {
    this.version = "002";
};

Exporter002.prototype.exportData = function () {
    var self = this,
        tables = [
            'posts', 'users', 'roles', 'roles_users', 'permissions',
            'permissions_roles', 'settings', 'tags', 'posts_tags',
            'custom_data', 'posts_custom_data'
        ],
        selectOps = _.map(tables, function (name) {
            return knex(name).select();
        });

    return when.all(selectOps).then(function (tableData) {
        var exportData = {
            meta: {
                exported_on: new Date().getTime(),
                version: self.version
            },
            data: {
                // Filled below
            }
        };

        _.each(tables, function (name, i) {
            exportData.data[name] = tableData[i];
        });

        return when.resolve(exportData);
    }, function (err) {
        console.log("Error exporting data: " + err);
    });
};

module.exports = {
    // Make available for unit tests
    Exporter002: Exporter002,

    exportData: function () {
        return new Exporter002().exportData();
    }
};