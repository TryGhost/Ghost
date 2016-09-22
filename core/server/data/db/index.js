var connection;

Object.defineProperty(exports, 'knex', {
    enumerable: true,
    configurable: true,
    get: function get() {
        connection = connection || require('./connection');
        return connection;
    }
});
