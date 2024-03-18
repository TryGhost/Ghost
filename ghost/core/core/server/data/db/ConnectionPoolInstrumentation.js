class ConnectionPoolInstrumentation {
    constructor({knex, logging, metrics, config}) {
        this.knex = knex;
        this.pool = this.knex.client.pool;
        this.logging = logging;
        this.metrics = metrics;
        this.enabled = config.get('telemetry:connectionPool');
        this.requestStartTimes = {};
        this.createStartTimes = {};
    }

    // Get the number of pending creates and acquires plus free and used connections
    getPoolMetrics() {
        return {
            numPendingCreates: this.pool.numPendingCreates(),
            numPendingAcquires: this.pool.numPendingAcquires(),
            numFree: this.pool.numFree(),
            numUsed: this.pool.numUsed()
        };
    }

    handleCreateRequest(eventId) {
        // Track when the request was submitted for calculating wait time
        this.createStartTimes[eventId] = Date.now();
        const poolMetrics = this.getPoolMetrics();
        this.logging.debug(`[ConnectionPool] Creating a connection. EventID: ${eventId} Pending Creates: ${poolMetrics.numPendingCreates} Free: ${poolMetrics.numFree} Used: ${poolMetrics.numUsed}`);
        this.metrics.metric('connection-pool', {
            event: 'create-request',
            eventId,
            ...poolMetrics
        });
    }

    handleCreateSuccess(eventId, resource) {
        // Calculate the time it took to create the connection
        const timeToCreate = Date.now() - this.createStartTimes[eventId];
        // Delete the start time so we don't leak memory
        delete this.createStartTimes[eventId];
        this.logging.debug(`[ConnectionPool] Created a connection. EventID: ${eventId} Connection ID: ${resource.connectionId} Knex ID: ${resource.__knexUid} Time to Create: ${timeToCreate}ms`);
        this.metrics.metric('connection-pool', {
            event: 'create-success',
            eventId,
            connectionId: resource.connectionId,
            knexUid: resource.__knexUid,
            timeToCreate
        });
    }

    handleCreateFail(eventId, err) {
        // Calculate the time it took to create the connection
        const timeToFail = Date.now() - this.createStartTimes[eventId];
        // Delete the start time so we don't leak memory
        delete this.createStartTimes[eventId];
        const poolMetrics = this.getPoolMetrics();
        this.logging.error(`[ConnectionPool] Failed to create a connection. EventID: ${eventId} Time to Create: ${timeToFail}ms`, err);
        this.metrics.metric('connection-pool', {
            event: 'create-fail',
            eventId,
            timeToFail,
            ...poolMetrics
        });
    }

    handleAcquireRequest(eventId) {
        // Track when the request was submitted for calculating wait time
        this.requestStartTimes[eventId] = Date.now();
        const poolMetrics = this.getPoolMetrics();
        this.logging.debug(`[ConnectionPool] Acquiring a connection. EventID: ${eventId} Pending Acquires: ${poolMetrics.numPendingAcquires} Free: ${poolMetrics.numFree} Used: ${poolMetrics.numUsed}`);
        this.metrics.metric('connection-pool', {
            event: 'acquire-request',
            eventId,
            ...poolMetrics
        });
    }

    handleAcquireSuccess(eventId, resource) {
        // Calculate the time it took to acquire the connection
        const timeToAcquire = Date.now() - this.requestStartTimes[eventId];
        // Delete the start time so we don't leak memory
        delete this.requestStartTimes[eventId];
        // Track when the connection was acquired for calculating lifetime upon release
        resource.connectionAcquired = Date.now();
        this.logging.debug(`[ConnectionPool] Acquired a connection. EventID: ${eventId} Connection ID: ${resource.connectionId} Knex Id: ${resource.__knexUid} Time to Acquire: ${timeToAcquire}ms`);
        this.metrics.metric('connection-pool', {
            event: 'acquire-success',
            eventId,
            connectionId: resource.connectionId,
            knexUid: resource.__knexUid,
            timeToAcquire
        });
    }

    handleAcquireFail(eventId, err) {
        // Calculate the time it took to acquire the connection
        const timeToFail = Date.now() - this.requestStartTimes[eventId];
        // Delete the start time so we don't leak memory
        delete this.requestStartTimes[eventId];
        const poolMetrics = this.getPoolMetrics();
        this.logging.error(`[ConnectionPool] Failed to acquire a connection. EventID: ${eventId} Time to Acquire: ${timeToFail}ms`, err);
        this.metrics.metric('connection-pool', {
            event: 'acquire-fail',
            eventId,
            timeToFail,
            ...poolMetrics
        });
    }

    handleRelease(resource) {
        const lifetime = Date.now() - resource.connectionAcquired;
        this.logging.debug(`[ConnectionPool] Released a connection. Connection ID: ${resource.connectionId} Lifetime: ${lifetime}ms`);
        this.metrics.metric('connection-pool', {
            event: 'release',
            connectionId: resource.connectionId,
            knexUid: resource.__knexUid,
            lifetime
        });
    }

    instrument() {
        if (this.enabled) {
            // Check to make sure these event listeners haven't already been added
            if (this.pool.emitter.eventNames().length === 0) {
                // Fires when a connection is requested to be created
                this.pool.on('createRequest', eventId => this.handleCreateRequest(eventId));
                // Fires when a connection is successfully created
                this.pool.on('createSuccess', (eventId, resource) => this.handleCreateSuccess(eventId, resource));
                // Fires when a connection fails to be created
                this.pool.on('createFail', (eventId, err) => this.handleCreateFail(eventId, err));
                // Fires when a connection is requested from the pool
                this.pool.on('acquireRequest', eventId => this.handleAcquireRequest(eventId));
                // Fires when a connection is allocated from the pool
                this.pool.on('acquireSuccess', (eventId, resource) => this.handleAcquireSuccess(eventId, resource));
                // Fires when a connection fails to be allocated from the pool
                this.pool.on('acquireFail', (eventId, err) => this.handleAcquireFail(eventId, err));
                // Fires when a connection is released back into the pool
                this.pool.on('release', resource => this.handleRelease(resource));
            }
        }
    }
}

module.exports = ConnectionPoolInstrumentation;
