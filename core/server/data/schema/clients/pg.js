var _ = require('lodash'),
    db = require('../../../data/db'),

    // private
    doRawFlattenAndPluck,

    // public
    getTables,
    getIndexes,
    getColumns;

doRawFlattenAndPluck = function doRaw(query, name, transaction) {
    return (transaction || db.knex).raw(query).then(function (response) {
        return _.flatten(_.map(response.rows, name));
    });
};

getTables = function getTables(transaction) {
    return doRawFlattenAndPluck(
        'SELECT table_name FROM information_schema.tables WHERE table_schema = CURRENT_SCHEMA()',
        'table_name',
        transaction
    );
};

getIndexes = function getIndexes(table, transaction) {
    var selectIndexes = 'SELECT t.relname as table_name, i.relname as index_name, a.attname as column_name' +
        ' FROM pg_class t, pg_class i, pg_index ix, pg_attribute a' +
        ' WHERE t.oid = ix.indrelid and i.oid = ix.indexrelid and' +
        ' a.attrelid = t.oid and a.attnum = ANY(ix.indkey) and t.relname = \'' + table + '\'';

    return doRawFlattenAndPluck(selectIndexes, 'index_name', transaction);
};

getColumns = function getColumns(table, transaction) {
    var selectIndexes = 'SELECT column_name FROM information_schema.columns WHERE table_name = \'' + table + '\'';

    return doRawFlattenAndPluck(selectIndexes, 'column_name', transaction);
};

module.exports = {
    getTables: getTables,
    getIndexes: getIndexes,
    getColumns: getColumns
};
