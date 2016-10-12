var Promise = require('bluebird'),
    commands = require('../../schema').commands,
    logging = require('../../../logging'),
    schema = require('../../schema').tables,
    schemaTables = Object.keys(schema);

module.exports = function createTables(options) {
    var transacting = options.transacting;

    return Promise.mapSeries(schemaTables, function createTable(table) {
        logging.info('Creating table: ' + table);
        return commands.createTable(table, transacting);
    });
};
