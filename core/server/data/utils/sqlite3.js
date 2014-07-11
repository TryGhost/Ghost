var _       = require('lodash'),
    config  = require('../../config');

function getTables() {
    return config().database.knex.raw("select * from sqlite_master where type = 'table'").then(function (response) {
        return _.reject(_.pluck(response, 'tbl_name'), function (name) {
            return name === 'sqlite_sequence';
        });
    });
}

function getIndexes(table) {
    return config().database.knex.raw("pragma index_list('" + table + "')").then(function (response) {

        return _.flatten(_.pluck(response, 'name'));
    });
}

function getColumns(table) {
    return config().database.knex.raw("pragma table_info('" + table + "')").then(function (response) {
        return _.flatten(_.pluck(response, 'name'));
    });
}

module.exports = {
    getTables:  getTables,
    getIndexes: getIndexes,
    getColumns: getColumns
};