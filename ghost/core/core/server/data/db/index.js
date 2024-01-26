const instrumentConnectionPool = require('./instrument-connection-pool');

let connection;

Object.defineProperty(exports, 'knex', {
    enumerable: true,
    configurable: true,
    get: function get() {
        connection = connection || require('./connection');
        instrumentConnectionPool(connection);
        return connection;
    }
});
