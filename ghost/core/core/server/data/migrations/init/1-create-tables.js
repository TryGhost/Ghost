const commands = require('../../schema').commands;
const schema = require('../../schema').tables;
const views = require('../../schema').views;
const logging = require('@tryghost/logging');
const schemaTables = Object.keys(schema);
const {sequence} = require('@tryghost/promise');

module.exports.up = async (options) => {
    const connection = options.connection;

    const existingTables = await commands.getTables(connection);
    const missingTables = schemaTables.filter(t => !existingTables.includes(t));

    await sequence(missingTables.map(table => async () => {
        logging.info('Creating table: ' + table);
        await commands.createTable(table, connection);
    }));

    // Create database views after all tables exist
    for (const view of views) {
        logging.info('Creating view: ' + view.name);
        await connection.raw('DROP VIEW IF EXISTS ??', [view.name]);
        await connection.raw('CREATE VIEW ?? AS ' + view.body, [view.name]);
    }
};

/**
 @TODO: This works, but is very dangerous in the current state of the knex-migrator v3.
 @TODO: Decide if we should enable or delete this
 module.exports.down = async (options) => {
        var connection = options.connection;

        // Reference between tables!
        schemaTables.reverse();
        await sequence(schemaTables.map(table => async () => {
            logging.info('Drop table: ' + table);
            await commands.deleteTable(table, connection);
        }));
    };
 */
