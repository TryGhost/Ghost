var  _              = require('lodash'),
    errors          = require('../../errors'),
    commands        = require('../schema').commands,
    schema          = require('../schema').tables,
    i18n            = require('../../i18n'),

    // private
    logInfo,

    // public
    getDeleteCommands,
    getAddCommands,
    addColumnCommands,
    modifyUniqueCommands;

logInfo = function logInfo(message) {
    errors.logInfo(i18n.t('notices.data.migration.commands.migrations'), message);
};

getDeleteCommands = function getDeleteCommands(oldTables, newTables) {
    var deleteTables = _.difference(oldTables, newTables);
    return _.map(deleteTables, function (table) {
        return function () {
            logInfo(i18n.t('notices.data.migration.commands.deletingTable', {table: table}));
            return commands.deleteTable(table);
        };
    });
};
getAddCommands = function getAddCommands(oldTables, newTables) {
    var addTables = _.difference(newTables, oldTables);
    return _.map(addTables, function (table) {
        return function () {
            logInfo(i18n.t('notices.data.migration.commands.creatingTable', {table: table}));
            return commands.createTable(table);
        };
    });
};
addColumnCommands = function addColumnCommands(table, columns) {
    var columnKeys = _.keys(schema[table]),
        addColumns = _.difference(columnKeys, columns);

    return _.map(addColumns, function (column) {
        return function () {
            logInfo(i18n.t('notices.data.migration.commands.addingColumn', {table: table, column: column}));
            return commands.addColumn(table, column);
        };
    });
};
modifyUniqueCommands = function modifyUniqueCommands(table, indexes) {
    var columnKeys = _.keys(schema[table]);
    return _.map(columnKeys, function (column) {
        if (schema[table][column].unique === true) {
            if (!_.contains(indexes, table + '_' + column + '_unique')) {
                return function () {
                    logInfo(i18n.t('notices.data.migration.commands.addingUnique', {table: table, column: column}));
                    return commands.addUnique(table, column);
                };
            }
        } else if (!schema[table][column].unique) {
            if (_.contains(indexes, table + '_' + column + '_unique')) {
                return function () {
                    logInfo(i18n.t('notices.data.migration.commands.droppingUnique', {table: table, column: column}));
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
    modifyUniqueCommands: modifyUniqueCommands
};
