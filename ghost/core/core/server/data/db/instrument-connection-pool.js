const logging = require('@tryghost/logging');
const metrics = require('@tryghost/metrics');
const config = require('../../../shared/config');

let requestStartTimes = {};
let createStartTimes = {};

// Get the number of pending creates and acquires plus free and used connections
function getPoolMetrics(pool) {
    return {
        numPendingCreates: pool.numPendingCreates(),
        numPendingAcquires: pool.numPendingAcquires(),
        numFree: pool.numFree(),
        numUsed: pool.numUsed()
    };
}

module.exports = function instrumentConnectionPool(knex) {
    const enabled = config.get('performanceMonitoring:connectionPool');
    if (enabled) {
        const pool = knex.client.pool;
        // Check to make sure these event listeners haven't already been added
        if (pool.emitter.eventNames().length === 0) {
            // Fires when a connection is requested to be created
            pool.on('createRequest', function createRequest(eventId) {
                // Track when the request was submitted for calculating wait time
                createStartTimes[eventId] = Date.now();
                const poolMetrics = getPoolMetrics(pool);
                logging.debug(`[ConnectionPool] Creating a connection. EventID: ${eventId} Pending Creates: ${poolMetrics.numPendingCreates} Free: ${poolMetrics.numFree} Used: ${poolMetrics.numUsed}`);
                metrics.metric('connection-pool-create-request', {
                    eventId,
                    ...poolMetrics
                });
            });
            // Fires when a connection is successfully created
            pool.on('createSuccess', function createSuccess(eventId, resource) {
                // Calculate the time it took to create the connection
                const timeToCreate = Date.now() - createStartTimes[eventId];
                // Delete the start time so we don't leak memory
                delete createStartTimes[eventId];
                logging.debug(`[ConnectionPool] Created a connection. EventID: ${eventId} Connection ID: ${resource.connectionId} Time to Create: ${timeToCreate}ms`);
                metrics.metric('connection-pool-create-success', {
                    eventId,
                    connectionId: resource.connectionId,
                    knexUid: resource.__knexUid,
                    timeToCreate
                });
            });
            // Fires when a connection fails to be created
            pool.on('createFail', function createFail(eventId, err) {
                // Calculate the time it took to create the connection
                const timeToFail = Date.now() - createStartTimes[eventId];
                // Delete the start time so we don't leak memory
                delete createStartTimes[eventId];
                const poolMetrics = getPoolMetrics(pool);
                logging.error(`[ConnectionPool] Failed to create a connection. EventID: ${eventId} Time to Create: ${timeToFail}ms`, err);
                metrics.metric('connection-pool-create-fail', {
                    eventId,
                    timeToFail,
                    ...poolMetrics
                });
            });
            // Fires when a connection is requested from the pool
            pool.on('acquireRequest', function acquireRequest(eventId) {
                // Track when the request was submitted for calculating wait time
                requestStartTimes[eventId] = Date.now();
                const poolMetrics = getPoolMetrics(pool);
                logging.debug(`[ConnectionPool] Acquiring a connection. EventID: ${eventId} Pending Acquires: ${poolMetrics.numPendingAcquires} Free: ${poolMetrics.numFree} Used: ${poolMetrics.numUsed}`);
                metrics.metric('connection-pool-acquire-request', {
                    eventId,
                    ...poolMetrics
                });
            });
            // Fires when a connection is allocated from the pool
            pool.on('acquireSuccess', function acquireSuccess(eventId, resource) {
                // Calculate the time it took to acquire the connection
                const timeToAcquire = Date.now() - requestStartTimes[eventId];
                // Delete the start time so we don't leak memory
                delete requestStartTimes[eventId];
                // Track when the connection was acquired for calculating lifetime upon release
                resource.connectionAcquired = Date.now();
                logging.debug(`[ConnectionPool] Acquired a connection. EventID: ${eventId} Connection ID: ${resource.connectionId} Time to Acquire: ${timeToAcquire}ms`);
                metrics.metric('connection-pool-acquire-success', {
                    eventId,
                    connectionId: resource.connectionId,
                    knexUid: resource.__knexUid,
                    timeToAcquire
                });
            });
            // Fires when a connection fails to be allocated from the pool
            pool.on('acquireFail', function acquireFail(eventId, err) {
                // Calculate the time it took to acquire the connection
                const timeToFail = Date.now() - requestStartTimes[eventId];
                // Delete the start time so we don't leak memory
                delete requestStartTimes[eventId];
                const poolMetrics = getPoolMetrics(pool);
                logging.error(`[ConnectionPool] Failed to acquire a connection. EventID: ${eventId} Time to Acquire: ${timeToFail}ms`, err);
                metrics.metric('connection-pool-acquire-fail', {
                    eventId,
                    timeToFail,
                    ...poolMetrics
                });
            });
            // Fires when a connection is released back into the pool
            pool.on('release', function releaseConnection(resource) {
                const lifetime = Date.now() - resource.connectionAcquired;
                logging.debug(`[ConnectionPool] Released a connection. Connection ID: ${resource.connectionId} Lifetime: ${lifetime}ms`);
                metrics.metric('connection-pool-release', {
                    connectionId: resource.connectionId,
                    knexUid: resource.__knexUid,
                    lifetime
                });
            });
        }
    }
};