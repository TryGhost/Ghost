/** @type {import('knex').Knex} */
let connection;

Object.defineProperty(exports, 'knex', {
    enumerable: true,
    configurable: true,
    get: function get() {
        const current = require('../../../shared/container/current');
        if (current.hasDefaultScope()) {
            return current.getCurrentScope().resolve('knex');
        }
        // Legacy path for processes that never boot the container (CLI tools, bare unit tests)
        connection = connection || require('./connection');
        return connection;
    }
});
