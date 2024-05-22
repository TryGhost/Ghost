const logging = require('@tryghost/logging');
const metrics = require('@tryghost/metrics');
const config = require('../../../shared/config');
const ConnectionPoolInstrumentation = require('./ConnectionPoolInstrumentation');

let connection;

Object.defineProperty(exports, 'knex', {
    enumerable: true,
    configurable: true,
    get: function get() {
        connection = connection || require('./connection');
        if (config.get('telemetry:connectionPool')) {
            const instrumentation = new ConnectionPoolInstrumentation({knex: connection, logging, metrics, config});
            instrumentation.instrument();
        }
        return connection;
    }
});
