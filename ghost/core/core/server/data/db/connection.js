const config = require('../../../shared/config');
const createConnection = require('./create-connection');

/** @type {import('knex').Knex} */
let knexInstance;

// @TODO:
// - if you require this file before config file was loaded,
// - then this file is cached and you have no chance to connect to the db anymore
// - bring dynamic into this file (db.connect())
if (!knexInstance && config.get('database') && config.get('database').client) {
    knexInstance = createConnection(config.get('database'));
}

module.exports = knexInstance;
