var _ = require('lodash'),
    db = require('../../../data/db'),

    // private
    doRaw,

    // public
    getTables,
    getIndexes,
    getColumns;

doRaw = function doRaw(query, transaction, fn) {
    if (!fn) {
        fn = transaction;
        transaction = null;
    }

    return (transaction || db.knex).raw(query).then(function (response) {
        return fn(response);
    });
};

getTables = function getTables(transaction) {
    return doRaw('select * from sqlite_master where type = "table"', transaction, function (response) {
        return _.reject(_.map(response, 'tbl_name'), function (name) {
            return name === 'sqlite_sequence';
        });
    });
};

getIndexes = function getIndexes(table, transaction) {
    return doRaw('pragma index_list("' + table + '")', transaction, function (response) {
        return _.flatten(_.map(response, 'name'));
    });
};

getColumns = function getColumns(table, transaction) {
    return doRaw('pragma table_info("' + table + '")', transaction, function (response) {
        return _.flatten(_.map(response, 'name'));
    });
};

module.exports = {
    getTables: getTables,
    getIndexes: getIndexes,
    getColumns: getColumns
};
