var _    = require('lodash'),
    knex = require('../../models/base').knex;

function getTables() {
    return knex.raw("select * from sqlite_master where type = 'table'").then(function (response) {
        return _.reject(_.pluck(response, 'tbl_name'), function (name) {
            return name === 'sqlite_sequence';
        });
    });
}

function getIndexes(table) {
    return knex.raw("pragma index_list('" + table + "')").then(function (response) {

        return _.flatten(_.pluck(response, 'name'));
    });
}

function getColumns(table) {
    return knex.raw("pragma table_info('" + table + "')").then(function (response) {
        return _.flatten(_.pluck(response, 'name'));
    });
}

module.exports = {
    getTables:  getTables,
    getIndexes: getIndexes,
    getColumns: getColumns
};