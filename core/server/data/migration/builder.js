var  _              = require('lodash'),
    errors          = require('../../errors'),
    commands        = require('../schema').commands,
    schema          = require('../schema').tables,

    // private
    logInfo,

    // public
    getDeleteCommands,
    getAddCommands,
    addColumnCommands,
    dropColumnCommands,
    modifyUniqueCommands;

logInfo = function logInfo(message) {
    errors.logInfo('Migrations', message);
};

getDeleteCommands = function getDeleteCommands(oldTables, newTables) {
    var deleteTables = _.difference(oldTables, newTables);
    return _.map(deleteTables, function (table) {
        return function () {
            logInfo('Deleting table: ' + table);
            return commands.deleteTable(table);
        };
    });
};

getAddCommands = function getAddCommands(oldTables, newTables) {
    var addTables = _.difference(newTables, oldTables);
    return _.map(addTables, function (table) {
        return function () {
            logInfo('Creating table: ' + table);
            return commands.createTable(table);
        };
    });
};

addColumnCommands = function addColumnCommands(table, columns) {
    var columnKeys = _.keys(schema[table]),
        addColumns = _.difference(columnKeys, columns);

    return _.map(addColumns, function (column) {
        return function () {
            logInfo('Adding column: ' + table + '.' + column);
            return commands.addColumn(table, column);
        };
    });
};

dropColumnCommands = function dropColumnCommands(table, columns) {
    var columnKeys = _.keys(schema[table]),
        dropColumns = _.difference(columns, columnKeys);

    return _.map(dropColumns, function (column) {
        return function () {
            logInfo('Dropping column: ' + table + '.' + column);
            return commands.dropColumn(table, column);
        };
    });
};

modifyUniqueCommands = function modifyUniqueCommands(table, indexes) {
    var columnKeys = _.keys(schema[table]);
    return _.map(columnKeys, function (column) {
        if (schema[table][column].unique === true) {
            if (!_.contains(indexes, table + '_' + column + '_unique')) {
                return function () {
                    logInfo('Adding unique on: ' + table + '.' + column);
                    return commands.addUnique(table, column);
                };
            }
        } else if (!schema[table][column].unique) {
            if (_.contains(indexes, table + '_' + column + '_unique')) {
                return function () {
                    logInfo('Dropping unique on: ' + table + '.' + column);
                    return commands.dropUnique(table, column);
                };
            }
        }
    });
};

module.exports = {
    getDeleteCommands: getDeleteCommands,
    getAddCommands: getAddCommands,
    addColumnCommands: addColumnCommands,
    dropColumnCommands: dropColumnCommands,
    modifyUniqueCommands: modifyUniqueCommands
};
