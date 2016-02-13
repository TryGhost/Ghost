var _  = require('lodash'),
    db = require('../../../data/db'),

    // private
    doRaw,

    // public
    getTables,
    getIndexes,
    getColumns;

doRaw = function doRaw(query, fn) {
    return db.knex.raw(query).then(function (response) {
        return fn(response);
    });
};

getTables = function getTables() {
    return doRaw('select * from sqlite_master where type = "table"', function (response) {
        return _.reject(_.pluck(response, 'tbl_name'), function (name) {
            return name === 'sqlite_sequence';
        });
    });
};

getIndexes = function getIndexes(table) {
    return doRaw('pragma index_list("' + table + '")', function (response) {
        return _.flatten(_.pluck(response, 'name'));
    });
};

getColumns = function getColumns(table) {
    return doRaw('pragma table_info("' + table + '")', function (response) {
        return _.flatten(_.pluck(response, 'name'));
    });
};

module.exports = {
    getTables:  getTables,
    getIndexes: getIndexes,
    getColumns: getColumns
};
