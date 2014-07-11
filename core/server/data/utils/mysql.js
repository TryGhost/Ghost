var _       = require('lodash'),
    config  = require('../../config');

function getTables() {
    return config().database.knex.raw('show tables').then(function (response) {
        return _.flatten(_.map(response[0], function (entry) {
            return _.values(entry);
        }));
    });
}

function getIndexes(table) {
    return config().database.knex.raw('SHOW INDEXES from ' + table).then(function (response) {
        return _.flatten(_.pluck(response[0], 'Key_name'));
    });
}

function getColumns(table) {
    return config().database.knex.raw('SHOW COLUMNS FROM ' + table).then(function (response) {
        return _.flatten(_.pluck(response[0], 'Field'));
    });
}

module.exports = {
    getTables:  getTables,
    getIndexes: getIndexes,
    getColumns: getColumns
};