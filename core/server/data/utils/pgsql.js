var _    = require('lodash'),
    knex = require('../../models/base').knex;

function getTables() {
    return knex.raw("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'").then(function (response) {
        return _.flatten(_.pluck(response.rows, 'table_name'));
    });
}

function getIndexes(table) {
    var selectIndexes = "SELECT t.relname as table_name, i.relname as index_name, a.attname as column_name"
        + " FROM pg_class t, pg_class i, pg_index ix, pg_attribute a"
        + " WHERE t.oid = ix.indrelid and i.oid = ix.indexrelid and"
        + " a.attrelid = t.oid and a.attnum = ANY(ix.indkey) and t.relname = '" + table + "'";

    return knex.raw(selectIndexes).then(function (response) {
        return _.flatten(_.pluck(response.rows, 'index_name'));
    });
}

function getColumns(table) {
    var selectIndexes = "SELECT column_name FROM information_schema.columns WHERE table_name = '" + table + "'";

    return knex.raw(selectIndexes).then(function (response) {
        return _.flatten(_.pluck(response.rows, 'column_name'));
    });
}

module.exports = {
    getTables:  getTables,
    getIndexes: getIndexes,
    getColumns: getColumns
};