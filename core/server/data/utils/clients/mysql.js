var _       = require('lodash'),
    config  = require('../../../config/index'),

    // private
    doRawAndFlatten,

    // public
    getTables,
    getIndexes,
    getColumns,
    checkPostTable;

doRawAndFlatten = function doRaw(query, flattenFn) {
    return config.database.knex.raw(query).then(function (response) {
        return _.flatten(flattenFn(response));
    });
};

getTables = function getTables() {
    return doRawAndFlatten('show tables', function (response) {
        return _.map(response[0], function (entry) { return _.values(entry); });
    });
};

getIndexes = function getIndexes(table) {
    return doRawAndFlatten('SHOW INDEXES from ' + table, function (response) {
        return _.pluck(response[0], 'Key_name');
    });
};

getColumns = function getColumns(table) {
    return doRawAndFlatten('SHOW COLUMNS FROM ' + table, function (response) {
        return _.pluck(response[0], 'Field');
    });
};

// This function changes the type of posts.html and posts.markdown columns to mediumtext. Due to
// a wrong datatype in schema.js some installations using mysql could have been created using the
// data type text instead of mediumtext.
// For details see: https://github.com/TryGhost/Ghost/issues/1947
checkPostTable = function checkPostTable() {
    return config.database.knex.raw('SHOW FIELDS FROM posts where Field ="html" OR Field = "markdown"').then(function (response) {
        return _.flatten(_.map(response[0], function (entry) {
            if (entry.Type.toLowerCase() !== 'mediumtext') {
                return config.database.knex.raw('ALTER TABLE posts MODIFY ' + entry.Field + ' MEDIUMTEXT');
            }
        }));
    });
};

module.exports = {
    checkPostTable: checkPostTable,
    getTables:  getTables,
    getIndexes: getIndexes,
    getColumns: getColumns
};
