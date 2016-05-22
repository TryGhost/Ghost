var knex = require(__dirname + '/../../../../../../node_modules/knex/lib/index'),
    utils = require('../../utils');

/**
 * mock database client
 * wrap knex
 */
exports.mock = function () {
    if (process.env.NODE_PROCESSNAME) {
        utils.mockNotExistingModule(/^knex$/, function (config) {
            if (config.client.match(/mysql|pg/)) {
                config.connection.database = config.connection.database + process.env.NODE_PROCESSNAME;
            } else {
                config.connection.filename = config.connection.filename + process.env.NODE_PROCESSNAME;
            }

            return knex(config);
        });
    }
};

/**
 * MOCHA-TNV
 *
 * each test file runs on a separate process
 * - each test file has its own database
 * - each test file has its own port
 if (process.env.NODE_PROCESSNAME) {
    if (config.database.client.match(/mysql|pg/)) {
        config.set({ database: { connection: { database: config.database.connection.database + process.env.NODE_PROCESSNAME }}});
    } else {
        config.set({ database: { connection: { filename: config.database.connection.filename + process.env.NODE_PROCESSNAME }}});
    }
}
 */

/*
 if (process.env.NODE_PORT) {
 config.set({ server: { port: process.env.NODE_PORT }});
 config.set({ url: config.url[config.url.length -1 ] === '/' ? config.url.slice(0, -5) + process.env.NODE_PORT + '/' : config.url.slice(0, -4) + process.env.NODE_PORT });
 }
 */
