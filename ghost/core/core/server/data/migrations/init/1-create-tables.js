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

    // Create views after tables exist. View creation is idempotent
    // (createViewOrReplace) so adding a new view to views.js does not require
    // a new init script — and crucially, no init script can be added because
    // that triggers knex-migrator's init() flow on upgrades, which records
    // all unapplied versioned migrations as applied WITHOUT running them.
    // Existing installs receive new views via versioned migrations.
    for (const [name, sql] of Object.entries(views)) {
        logging.info('Creating view: ' + name);
        await commands.createViewOrReplace(name, sql, connection);
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
