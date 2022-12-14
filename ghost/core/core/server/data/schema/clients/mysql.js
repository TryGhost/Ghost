const _ = require('lodash');
const db = require('../../../data/db');

const doRawAndFlatten = function doRaw(query, transaction = db.knex, flattenFn) {
    return transaction.raw(query).then(function (response) {
        return _.flatten(flattenFn(response));
    });
};

const getTables = function getTables(transaction) {
    return doRawAndFlatten('show tables', transaction, function (response) {
        return _.map(response[0], function (entry) {
            return _.values(entry);
        });
    });
};

const getIndexes = function getIndexes(table, transaction) {
    return doRawAndFlatten('SHOW INDEXES from ' + table, transaction, function (response) {
        return _.map(response[0], 'Key_name');
    });
};

const getColumns = function getColumns(table, transaction) {
    return doRawAndFlatten('SHOW COLUMNS FROM ' + table, transaction, function (response) {
        return _.map(response[0], 'Field');
    });
};

module.exports = {
    getTables: getTables,
    getIndexes: getIndexes,
    getColumns: getColumns
};
