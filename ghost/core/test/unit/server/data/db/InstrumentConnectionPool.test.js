const sinon = require('sinon');
const ConnectionPoolInstrumentation = require('../../../../../core/server/data/db/ConnectionPoolInstrumentation');
const should = require('should');
var EventEmitter = require('events').EventEmitter;

describe('ConnectionPoolInstrumentation', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('getPoolMetrics', async function () {
        const knex = {
            client: {
                pool: {
                    numPendingCreates: sinon.stub().returns(1),
                    numPendingAcquires: sinon.stub().returns(2),
                    numFree: sinon.stub().returns(3),
                    numUsed: sinon.stub().returns(4)
                }
            }
        };
        const logging = {};
        const metrics = {};
        const config = {
            get: sinon.stub().withArgs('telemetry:connectionPool').returns(true)
        };
        const instrumentation = new ConnectionPoolInstrumentation({knex, logging, metrics, config});
        const result = instrumentation.getPoolMetrics();
        result.should.eql({
            numPendingCreates: 1,
            numPendingAcquires: 2,
            numFree: 3,
            numUsed: 4
        });
    });

    it('should handle creating a request successfully', async function () {
        const knex = {
            client: {
                pool: {
                    numPendingCreates: sinon.stub().returns(1),
                    numPendingAcquires: sinon.stub().returns(2),
                    numFree: sinon.stub().returns(3),
                    numUsed: sinon.stub().returns(4)
                }
            }
        };
        const logging = {
            debug: sinon.stub()
        };
        const metrics = {
            metric: sinon.stub()
        };
        const config = {
            get: sinon.stub().withArgs('telemetry:connectionPool').returns(true)
        };
        const instrumentation = new ConnectionPoolInstrumentation({knex, logging, metrics, config});
        instrumentation.handleCreateRequest(1);
        instrumentation.handleCreateSuccess(1, {connectionId: 2, __knexUid: 3});
        logging.debug.calledTwice.should.be.true();
        metrics.metric.calledTwice.should.be.true();
    });

    it('should handle creating a request unsuccessfully', async function () {
        const knex = {
            client: {
                pool: {
                    numPendingCreates: sinon.stub().returns(1),
                    numPendingAcquires: sinon.stub().returns(2),
                    numFree: sinon.stub().returns(3),
                    numUsed: sinon.stub().returns(4)
                }
            }
        };
        const logging = {
            debug: sinon.stub(),
            error: sinon.stub()
        };
        const metrics = {
            metric: sinon.stub()
        };
        const config = {
            get: sinon.stub().withArgs('telemetry:connectionPool').returns(true)
        };
        const instrumentation = new ConnectionPoolInstrumentation({knex, logging, metrics, config});
        instrumentation.handleCreateRequest(1);
        instrumentation.handleCreateFail(1, new Error('test'));
        logging.error.calledOnce.should.be.true();
        metrics.metric.calledTwice.should.be.true();
    });

    it('should handle acquiring a connection successfully', async function () {
        const knex = {
            client: {
                pool: {
                    numPendingCreates: sinon.stub().returns(1),
                    numPendingAcquires: sinon.stub().returns(2),
                    numFree: sinon.stub().returns(3),
                    numUsed: sinon.stub().returns(4)
                }
            }
        };
        const logging = {
            debug: sinon.stub()
        };
        const metrics = {
            metric: sinon.stub()
        };
        const config = {
            get: sinon.stub().withArgs('telemetry:connectionPool').returns(true)
        };
        const instrumentation = new ConnectionPoolInstrumentation({knex, logging, metrics, config});
        instrumentation.handleAcquireRequest(1);
        instrumentation.handleAcquireSuccess(1, {connectionId: 2, __knexUid: 3});
        logging.debug.calledTwice.should.be.true();
        metrics.metric.calledTwice.should.be.true();
    });

    it('should handle acquiring a connection unsuccessfully', async function () {
        const knex = {
            client: {
                pool: {
                    numPendingCreates: sinon.stub().returns(1),
                    numPendingAcquires: sinon.stub().returns(2),
                    numFree: sinon.stub().returns(3),
                    numUsed: sinon.stub().returns(4)
                }
            }
        };
        const logging = {
            debug: sinon.stub(),
            error: sinon.stub()
        };
        const metrics = {
            metric: sinon.stub()
        };
        const config = {
            get: sinon.stub().withArgs('telemetry:connectionPool').returns(true)
        };
        const instrumentation = new ConnectionPoolInstrumentation({knex, logging, metrics, config});
        instrumentation.handleAcquireRequest(1);
        instrumentation.handleAcquireFail(1, new Error('test'));
        logging.error.calledOnce.should.be.true();
        metrics.metric.calledTwice.should.be.true();
    });

    it('should handle releasing a connection successfully', async function () {
        const knex = {
            client: {
                pool: {
                    numPendingCreates: sinon.stub().returns(1),
                    numPendingAcquires: sinon.stub().returns(2),
                    numFree: sinon.stub().returns(3),
                    numUsed: sinon.stub().returns(4)
                }
            }
        };
        const logging = {
            debug: sinon.stub()
        };
        const metrics = {
            metric: sinon.stub()
        };
        const config = {
            get: sinon.stub().withArgs('telemetry:connectionPool').returns(true)
        };
        const instrumentation = new ConnectionPoolInstrumentation({knex, logging, metrics, config});
        instrumentation.handleRelease(1);
        logging.debug.calledOnce.should.be.true();
        metrics.metric.calledOnce.should.be.true();
    });

    it('should instrument the connection pool if enabled', async function () {
        const knex = {
            client: {
                pool: {
                    numPendingCreates: sinon.stub().returns(1),
                    numPendingAcquires: sinon.stub().returns(2),
                    numFree: sinon.stub().returns(3),
                    numUsed: sinon.stub().returns(4),
                    on: sinon.stub(),
                    emitter: new EventEmitter()
                }
            }
        };
        const logging = {
            debug: sinon.stub(),
            error: sinon.stub()
        };
        const metrics = {
            metric: sinon.stub()
        };
        const config = {
            get: sinon.stub().withArgs('telemetry:connectionPool').returns(true)
        };
        const instrumentation = new ConnectionPoolInstrumentation({knex, logging, metrics, config});
        instrumentation.instrument();
        knex.client.pool.on.callCount.should.eql(7);
    });

    it('should not instrument the connection pool if disabled', async function () {
        const knex = {
            client: {
                pool: {
                    numPendingCreates: sinon.stub().returns(1),
                    numPendingAcquires: sinon.stub().returns(2),
                    numFree: sinon.stub().returns(3),
                    numUsed: sinon.stub().returns(4),
                    on: sinon.stub(),
                    emitter: new EventEmitter()
                }
            }
        };
        const logging = {
            debug: sinon.stub(),
            error: sinon.stub()
        };
        const metrics = {
            metric: sinon.stub()
        };
        const config = {
            get: sinon.stub().withArgs('telemetry:connectionPool').returns(false)
        };
        const instrumentation = new ConnectionPoolInstrumentation({knex, logging, metrics, config});
        instrumentation.instrument();
        knex.client.pool.on.callCount.should.eql(0);
    });
});