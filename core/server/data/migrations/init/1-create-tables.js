const Promise = require('bluebird');
const commands = require('../../schema').commands;
const schema = require('../../schema').tables;
const logging = require('@tryghost/logging');
const schemaTables = Object.keys(schema);

module.exports.up = async (options) => {
    const connection = options.connection;

    await Promise.mapSeries(schemaTables, async (table) => {
        logging.info('Creating table: ' + table);
        await commands.createTable(table, connection);
    });
};

/**
 @TODO: This works, but is very dangerous in the current state of the knex-migrator v3.
 @TODO: Decide if we should enable or delete this
 module.exports.down = async (options) => {
        var connection = options.connection;

        // Reference between tables!
        schemaTables.reverse();
        await Promise.mapSeries(schemaTables, async (table) => {
            logging.info('Drop table: ' + table);
            await commands.deleteTable(table, connection);
        });
    };
 */
