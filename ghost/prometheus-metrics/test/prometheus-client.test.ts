import assert from 'assert/strict';
import {PrometheusClient} from '../src';
import {Request, Response} from 'express';
import * as sinon from 'sinon';
import type {Knex} from 'knex';
import nock from 'nock';
import {EventEmitter} from 'events';
import type {EventEmitter as EventEmitterType} from 'events';
import type {Gauge, Counter, Summary, Pushgateway, RegistryContentType} from 'prom-client';

describe('Prometheus Client', function () {
    let instance: PrometheusClient;
    let logger: any;

    beforeEach(function () {
        sinon.restore();
        logger = {
            info: sinon.stub(),
            error: sinon.stub()
        };
    });

    afterEach(function () {
        if (instance) {
            instance.stop();
            instance.client.register.clear();
        }
        nock.cleanAll();
    });

    describe('constructor', function () {
        it('should create a new instance', function () {
            instance = new PrometheusClient();
            assert.ok(instance);
        });
    });

    describe('init', function () {
        it('should call collectDefaultMetrics', function () {
            instance = new PrometheusClient();
            const collectDefaultMetricsSpy = sinon.spy(instance.client, 'collectDefaultMetrics');
            instance.init();
            assert.ok(collectDefaultMetricsSpy.called);
        });

        it('should create the pushgateway client if the pushgateway is enabled', async function () {
            const clock = sinon.useFakeTimers();
            nock('http://localhost:9091')
                .persist()
                .post('/metrics/job/ghost')
                .reply(200);
            
            instance = new PrometheusClient({pushgateway: {enabled: true, interval: 20}});
            const pushMetricsStub = sinon.stub(instance, 'pushMetrics').resolves();
            instance.init();
            assert.ok(instance.gateway);
            assert.ok(pushMetricsStub.called, 'pushMetrics should be called immediately');
            clock.tick(30);
            assert.ok(pushMetricsStub.calledTwice, 'pushMetrics should be called again after the interval');
            clock.restore();
        });
    });

    describe('collectDefaultMetrics', function () {
        it('should call collectDefaultMetrics on the client', function () {
            instance = new PrometheusClient();
            const collectDefaultMetricsSpy = sinon.spy(instance.client, 'collectDefaultMetrics');
            instance.collectDefaultMetrics();
            assert.ok(collectDefaultMetricsSpy.called);
        });
    });

    describe('pushMetrics', function () {
        it('should push metrics to the pushgateway', async function () {
            const scope = nock('http://localhost:9091')
                .persist()
                .post('/metrics/job/ghost')
                .reply(200);
            instance = new PrometheusClient({pushgateway: {enabled: true}});
            instance.init();
            await instance.pushMetrics();
            scope.done();
        });

        it('should log an error with error code if pushing metrics to the gateway fails', async function () {
            instance = new PrometheusClient({pushgateway: {enabled: true}}, logger);
            instance.init();
            instance.gateway = {
                pushAdd: sinon.stub().rejects({code: 'ECONNRESET'})
            } as unknown as Pushgateway<RegistryContentType>;
            await instance.pushMetrics();
            assert.ok(logger.error.called);
            const [[error]] = logger.error.args;
            assert.match(error, /ECONNRESET/);
        });

        it('should log a generic error if the error is unknown', async function () {
            instance = new PrometheusClient({pushgateway: {enabled: true}}, logger);
            instance.init();
            instance.gateway = {
                pushAdd: sinon.stub().rejects()
            } as unknown as Pushgateway<RegistryContentType>;
            await instance.pushMetrics();
            assert.ok(logger.error.called);
            const [[error]] = logger.error.args;
            assert.match(error, /Unknown error/);
        });
    });

    describe('handleMetricsRequest', function () {
        it('should return the metrics', async function () {
            const setStub = sinon.stub();
            const endStub = sinon.stub();
            const req = {} as Request;
            const res = {
                set: setStub,
                end: endStub
            } as unknown as Response;
            await instance.handleMetricsRequest(req, res);
            assert.ok(setStub.calledWith('Content-Type', instance.getContentType()));
            assert.ok(endStub.calledOnce);
        });

        it('should return an error if getting metrics fails', async function () {
            instance = new PrometheusClient();
            sinon.stub(instance, 'getMetrics').throws(new Error('Failed to get metrics'));
            const statusStub = sinon.stub().returnsThis();
            const endStub = sinon.stub();
            const req = {} as Request;
            const res = {
                set: sinon.stub(),
                end: endStub,
                status: statusStub
            } as unknown as Response;
            await instance.handleMetricsRequest(req, res);
            assert.ok(statusStub.calledWith(500));
            assert.ok(endStub.calledOnce);
        });

        it('should return a generic error if the error is unknown', async function () {
            instance = new PrometheusClient();
            sinon.stub(instance, 'getMetrics').throws({name: 'UnknownError'});
            const statusStub = sinon.stub().returnsThis();
            const endStub = sinon.stub();
            const req = {} as Request;
            const res = {
                set: sinon.stub(),
                end: endStub,
                status: statusStub
            } as unknown as Response;
            await instance.handleMetricsRequest(req, res);
            assert.ok(statusStub.calledWith(500));
            assert.ok(endStub.calledOnce);
        });
    });

    describe('getMetrics', function () {
        it('should return metrics', async function () {
            instance = new PrometheusClient();
            instance.init();
            const metrics = await instance.getMetrics();
            assert.match(metrics, /^# HELP/);
        });
    });

    describe('instrumentKnex', function () {
        let knexMock: Knex;
        let eventEmitter: EventEmitterType;

        function simulateQuery(queryUid: string, duration: number) {
            const clock = sinon.useFakeTimers();
            eventEmitter.emit('query', {__knexQueryUid: queryUid, sql: 'SELECT 1'});
            clock.tick(duration);
            eventEmitter.emit('query-response', null, {__knexQueryUid: queryUid, sql: 'SELECT 1'});
            clock.restore();
        }

        function simulateQueries(durations: number[]) {
            durations.forEach((duration, index) => {
                simulateQuery(`${index}`, duration);
            });
        }

        beforeEach(function () {
            eventEmitter = new EventEmitter();
            knexMock = {
                on: sinon.stub().callsFake((event, callback) => {
                    eventEmitter.on(event, callback);
                }),
                client: {
                    pool: {
                        max: 10,
                        min: 1,
                        numUsed: sinon.stub().returns(0),
                        numFree: sinon.stub().returns(0),
                        numPendingAcquires: sinon.stub().returns(0),
                        numPendingCreates: sinon.stub().returns(0)
                    }
                }
            } as unknown as Knex;
        });

        afterEach(function () {
            sinon.restore();
        });

        it('should create all the custom metrics for the connection pool and queries', function () {
            instance = new PrometheusClient();
            instance.init();
            instance.instrumentKnex(knexMock);
            const metrics = Array.from(instance.customMetrics.keys());
            assert.deepEqual(metrics, [
                'ghost_db_connection_pool_max',
                'ghost_db_connection_pool_min',
                'ghost_db_connection_pool_active',
                'ghost_db_connection_pool_used',
                'ghost_db_connection_pool_idle',
                'ghost_db_connection_pool_pending_acquires',
                'ghost_db_connection_pool_pending_creates',
                'ghost_db_query_count',
                'ghost_db_query_duration_milliseconds'
            ]);
        });

        it('should collect the connection pool max metric', async function () {
            instance = new PrometheusClient();
            instance.init();
            instance.instrumentKnex(knexMock);
            const connectionPoolMaxGauge = instance.customMetrics.get('ghost_db_connection_pool_max') as Gauge;
            const result = await connectionPoolMaxGauge.get();
            assert.equal(result.values[0].value, 10);
        });

        it('should collect the connection pool min metric', async function () {
            instance = new PrometheusClient();
            instance.init();
            instance.instrumentKnex(knexMock);
            const connectionPoolMinGauge = instance.customMetrics.get('ghost_db_connection_pool_min') as Gauge;
            const result = await connectionPoolMinGauge.get();
            assert.equal(result.values[0].value, 1);
        });

        it('should collect the connection pool active metric', async function () {
            knexMock.client.pool.numUsed = sinon.stub().returns(3);
            knexMock.client.pool.numFree = sinon.stub().returns(7);
            instance = new PrometheusClient();
            instance.init();
            instance.instrumentKnex(knexMock);
            const connectionPoolActiveGauge = instance.customMetrics.get('ghost_db_connection_pool_active') as Gauge;
            const result = await connectionPoolActiveGauge.get();
            assert.equal(result.values[0].value, 10);
        });

        it('should collect the connection pool used metric', async function () {
            knexMock.client.pool.numUsed = sinon.stub().returns(3);
            instance = new PrometheusClient();
            instance.init();
            instance.instrumentKnex(knexMock);
            const connectionPoolUsedGauge = instance.customMetrics.get('ghost_db_connection_pool_used') as Gauge;
            const result = await connectionPoolUsedGauge.get();
            assert.equal(result.values[0].value, 3);
        });

        it('should collect the connection pool idle metric', async function () {
            knexMock.client.pool.numFree = sinon.stub().returns(7);
            instance = new PrometheusClient();
            instance.init();
            instance.instrumentKnex(knexMock);
            const connectionPoolIdleGauge = instance.customMetrics.get('ghost_db_connection_pool_idle') as Gauge;
            const result = await connectionPoolIdleGauge.get();
            assert.equal(result.values[0].value, 7);
        });

        it('should collect the connection pool pending acquires metric', async function () {
            knexMock.client.pool.numPendingAcquires = sinon.stub().returns(3);
            instance = new PrometheusClient();
            instance.init();
            instance.instrumentKnex(knexMock);
            const connectionPoolPendingAcquiresGauge = instance.customMetrics.get('ghost_db_connection_pool_pending_acquires') as Gauge;
            const result = await connectionPoolPendingAcquiresGauge.get();
            assert.equal(result.values[0].value, 3);
        });

        it('should collect the connection pool pending creates metric', async function () {
            knexMock.client.pool.numPendingCreates = sinon.stub().returns(3);
            instance = new PrometheusClient();
            instance.init();
            instance.instrumentKnex(knexMock);
            const connectionPoolPendingCreatesGauge = instance.customMetrics.get('ghost_db_connection_pool_pending_creates') as Gauge;
            const result = await connectionPoolPendingCreatesGauge.get();
            assert.equal(result.values[0].value, 3);
        });

        it('should collect the db query count metric', async function () {
            instance = new PrometheusClient();
            instance.init();
            instance.instrumentKnex(knexMock);
            const dbQueryCountGauge = instance.customMetrics.get('ghost_db_query_count') as Counter;
            const result = await dbQueryCountGauge.get();
            assert.equal(result.values[0].value, 0);
        });

        it('should increment the db query count metric when a query is executed', async function () {
            instance = new PrometheusClient();
            instance.init();
            instance.instrumentKnex(knexMock);
            eventEmitter.emit('query', {__knexQueryUid: '1', sql: 'SELECT 1'});
            const dbQueryCountGauge = instance.customMetrics.get('ghost_db_query_count') as Counter;
            const result = await dbQueryCountGauge.get();
            assert.equal(result.values[0].value, 1);
            assert.equal(instance.queries.size, 1);
            assert.ok(instance.queries.has('1'));
        });

        it('should collect the db query duration metric when a query is executed', async function () {
            instance = new PrometheusClient();
            instance.init();
            instance.instrumentKnex(knexMock);
            eventEmitter.emit('query', {__knexQueryUid: '1', sql: 'SELECT 1'});
            const dbQueryDurationSummary = instance.customMetrics.get('ghost_db_query_duration_milliseconds') as Summary;
            const result = await dbQueryDurationSummary.get();
            assert.equal(result.values[0].value, 0);
        });

        it('should accurately calculate the query duration of a query', async function () {
            instance = new PrometheusClient();
            instance.init();
            instance.instrumentKnex(knexMock);
            const durations = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
            simulateQueries(durations);
            const dbQueryDurationSummary = instance.customMetrics.get('ghost_db_query_duration_milliseconds') as Summary;
            const result = await dbQueryDurationSummary.get();
            assert.deepEqual(result.values, [
                {labels: {quantile: 0.5}, value: 550},
                {labels: {quantile: 0.9}, value: 950},
                {labels: {quantile: 0.99}, value: 1000},
                {metricName: 'ghost_db_query_duration_milliseconds_sum', labels: {}, value: 5500},
                {metricName: 'ghost_db_query_duration_milliseconds_count', labels: {}, value: 10}
            ]);
        });
    });
});
