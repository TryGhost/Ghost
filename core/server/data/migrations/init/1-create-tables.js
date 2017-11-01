var Promise = require('bluebird'),
    commands = require('../../schema').commands,
    logging = require('../../../logging'),
    schema = require('../../schema').tables,
    schemaTables = Object.keys(schema);

module.exports.up = function createTables(options) {
    var connection = options.connection;

    return Promise.mapSeries(schemaTables, function createTable(table) {
        logging.info('Creating table: ' + table);
        return commands.createTable(table, connection);
    });
};

module.exports.down = function dropTables(options) {
    var connection = options.connection;

    // Reference between tables!
    schemaTables.reverse();
    return Promise.mapSeries(schemaTables, function dropTable(table) {
        logging.info('Drop table: ' + table);
        return commands.deleteTable(table, connection);
    });
};
