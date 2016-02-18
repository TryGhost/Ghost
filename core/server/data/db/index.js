var connection;

Object.defineProperty(exports, 'knex', {
    enumerable: true,
    configurable: false,
    get: function get() {
        connection = connection || require('./connection');
        return connection;
    }
});
