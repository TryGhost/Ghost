/** @type {import('knex').Knex} */
let connection;

Object.defineProperty(exports, 'knex', {
    enumerable: true,
    configurable: true,
    get: function get() {
        const {hasDefaultScope, getCurrentScope} = require('../../../shared/container/current');
        if (hasDefaultScope()) {
            return getCurrentScope().resolve('knex');
        }
        // Legacy path for processes that never boot the container (CLI tools, bare unit tests)
        connection = connection || require('./connection');
        return connection;
    }
});
