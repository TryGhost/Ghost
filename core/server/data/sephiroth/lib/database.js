var knex = require('knex');

/**
 * we only support knex
 */
exports.connect = function connect(options) {
    options = options || {};
    var client = options.client;

    if (client === 'sqlite3') {
        options.useNullAsDefault = options.useNullAsDefault || false;
    }

    if (client === 'mysql') {
        options.connection.timezone = 'UTC';
        options.connection.charset = 'utf8mb4';
    }

    exports.knex = knex(options);
};
