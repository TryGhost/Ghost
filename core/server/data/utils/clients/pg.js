var _       = require('lodash'),
    config  = require('../../../config/index'),

    // private
    doRawFlattenAndPluck,

    // public
    getTables,
    getIndexes,
    getColumns;

doRawFlattenAndPluck = function doRaw(query, name) {
    return config.database.knex.raw(query).then(function (response) {
        return _.flatten(_.pluck(response.rows, name));
    });
};

getTables = function getTables() {
    return doRawFlattenAndPluck(
        'SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\' and table_name not like \'pg_%\'', 'table_name'
    );
};

getIndexes = function getIndexes(table) {
    var selectIndexes = 'SELECT t.relname as table_name, i.relname as index_name, a.attname as column_name' +
        ' FROM pg_class t, pg_class i, pg_index ix, pg_attribute a' +
        ' WHERE t.oid = ix.indrelid and i.oid = ix.indexrelid and' +
        ' a.attrelid = t.oid and a.attnum = ANY(ix.indkey) and t.relname = \'' + table + '\'';

    return doRawFlattenAndPluck(selectIndexes, 'index_name');
};

getColumns = function getColumns(table) {
    var selectIndexes = 'SELECT column_name FROM information_schema.columns WHERE table_name = \'' + table + '\'';

    return doRawFlattenAndPluck(selectIndexes, 'column_name');
};

module.exports = {
    getTables:  getTables,
    getIndexes: getIndexes,
    getColumns: getColumns
};
