import assert from 'assert/strict';
import {PrometheusClient} from '../src';
import {Request, Response} from 'express';
import * as sinon from 'sinon';
import type {Knex} from 'knex';
import nock from 'nock';
import {EventEmitter} from 'events';
import type {EventEmitter as EventEmitterType} from 'events';
import type {Gauge, Counter, Summary, Pushgateway, RegistryContentType, Metric} from 'prom-client';

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
        it('should return metrics as a string', async function () {
            instance = new PrometheusClient();
            instance.init();
            const metrics = await instance.getMetrics();
            assert.equal(typeof metrics, 'string');
            assert.match(metrics as string, /^# HELP/);
        });
    });

    describe('getMetricsAsJSON', function () {
        it('should return metrics as an array of objects', async function () {
            instance = new PrometheusClient();
            instance.init();
            const metrics = await instance.getMetricsAsJSON();
            assert.equal(typeof metrics, 'object');
            assert.ok(Array.isArray(metrics));
            assert.ok(Object.keys(metrics[0]).includes('name'));
        });
    });

    describe('getMetricsAsArray', function () {
        it('should return metrics as an array', async function () {
            instance = new PrometheusClient();
            instance.init();
            const metricsArray = await instance.getMetricsAsArray();
            assert.ok(Array.isArray(metricsArray));
            assert.ok((metricsArray[0] as Metric).get());
        });
    });

    describe('getMetric', function () {
        it('should return a metric from the registry by name', async function () {
            instance = new PrometheusClient();
            instance.init();
            const metric = instance.getMetric('ghost_process_cpu_seconds_total');
            assert.ok(metric);
        });

        it('should return undefined if the metric is not found', function () {
            instance = new PrometheusClient();
            instance.init();
            const metric = instance.getMetric('ghost_not_a_metric');
            assert.equal(metric, undefined);
        });

        it('should add the prefix to the metric name if it is not already present', function () {
            instance = new PrometheusClient();
            instance.init();
            const metric = instance.getMetric('process_cpu_seconds_total');
            assert.ok(metric);
        });
    });

    describe('getMetricObject', function () {
        it('should return the values of a metric', async function () {
            instance = new PrometheusClient();
            instance.init();
            const metricObject = await instance.getMetricObject('ghost_process_cpu_seconds_total');
            assert.ok(metricObject);
            assert.ok(metricObject.values);
            assert.ok(Array.isArray(metricObject.values));
            assert.equal(metricObject.help, 'Total user and system CPU time spent in seconds.');
            assert.equal(metricObject.type, 'counter');
            assert.equal(metricObject.name, 'ghost_process_cpu_seconds_total');
        });

        it('should return undefined if the metric is not found', async function () {
            instance = new PrometheusClient();
            instance.init();
            const metricObject = await instance.getMetricObject('ghost_not_a_metric');
            assert.equal(metricObject, undefined);
        });
    });

    describe('getMetricValues', function () {
        it('should return the values of a metric', async function () {
            instance = new PrometheusClient();
            instance.init();
            const metricValues = await instance.getMetricValues('ghost_process_cpu_seconds_total');
            assert.ok(metricValues);
            assert.ok(Array.isArray(metricValues));
        });

        it('should return undefined if the metric is not found', async function () {
            instance = new PrometheusClient();
            instance.init();
            const metricValues = await instance.getMetricValues('ghost_not_a_metric');
            assert.equal(metricValues, undefined);
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

    describe('Custom Metrics', function () {
        describe('registerCounter', function () {
            it('should add the counter metric to the registry', function () {
                instance = new PrometheusClient();
                instance.init();
                instance.registerCounter({name: 'test_counter', help: 'A test counter'});
                const metric = instance.getMetric('ghost_test_counter');
                assert.ok(metric);
            });

            it('should return the counter metric', function () {
                instance = new PrometheusClient();
                instance.init();
                const counter = instance.registerCounter({name: 'test_counter', help: 'A test counter'});
                const metric = instance.getMetric('ghost_test_counter');
                assert.equal(metric, counter);
            });

            it('should increment the counter', async function () {
                instance = new PrometheusClient();
                instance.init();
                const counter = instance.registerCounter({name: 'test_counter', help: 'A test counter'});
                const metricValuesBefore = await instance.getMetricValues('ghost_test_counter');
                assert.deepEqual(metricValuesBefore, [{value: 0, labels: {}}]);
                counter.inc();
                const metricValuesAfter = await instance.getMetricValues('ghost_test_counter');
                assert.deepEqual(metricValuesAfter, [{value: 1, labels: {}}]);
            });
        });

        describe('registerGauge', function () {
            it('should add the gauge metric to the registry', function () {
                instance = new PrometheusClient();
                instance.init();
                instance.registerGauge({name: 'test_gauge', help: 'A test gauge'});
                const metric = instance.getMetric('ghost_test_gauge');
                assert.ok(metric);
            });

            it('should return the gauge metric', function () {
                instance = new PrometheusClient();
                instance.init();
                const gauge = instance.registerGauge({name: 'test_gauge', help: 'A test gauge'});
                const metric = instance.getMetric('ghost_test_gauge');
                assert.equal(metric, gauge);
            });

            it('should set the gauge value', async function () {
                instance = new PrometheusClient();
                instance.init();
                const gauge = instance.registerGauge({name: 'test_gauge', help: 'A test gauge'});
                gauge.set(10);
                const metricValues = await instance.getMetricValues('ghost_test_gauge');
                assert.deepEqual(metricValues, [{value: 10, labels: {}}]);
            });

            it('should increment the gauge', async function () {
                instance = new PrometheusClient();
                instance.init();
                const gauge = instance.registerGauge({name: 'test_gauge', help: 'A test gauge'});
                const metricValuesBefore = await instance.getMetricValues('ghost_test_gauge');
                assert.deepEqual(metricValuesBefore, [{value: 0, labels: {}}]);
                gauge.inc();
                const metricValuesAfter = await instance.getMetricValues('ghost_test_gauge');
                assert.deepEqual(metricValuesAfter, [{value: 1, labels: {}}]);
            });

            it('should decrement the gauge', async function () {
                instance = new PrometheusClient();
                instance.init();
                const gauge = instance.registerGauge({name: 'test_gauge', help: 'A test gauge'});
                const metricValuesBefore = await instance.getMetricValues('ghost_test_gauge');
                assert.deepEqual(metricValuesBefore, [{value: 0, labels: {}}]);
                gauge.dec();
                const metricValuesAfter = await instance.getMetricValues('ghost_test_gauge');
                assert.deepEqual(metricValuesAfter, [{value: -1, labels: {}}]);
            });

            it('should use the collect function to set the gauge value', async function () {
                instance = new PrometheusClient();
                instance.init();
                instance.registerGauge({name: 'test_gauge', help: 'A test gauge', collect() {
                    (this as unknown as Gauge).set(10); // `this` is the gauge instance
                }});
                const metricValues = await instance.getMetricValues('ghost_test_gauge');
                assert.deepEqual(metricValues, [{value: 10, labels: {}}]);
            });

            it('should use an async collect function to set the gauge value', async function () {
                instance = new PrometheusClient();
                instance.init();
                instance.registerGauge({name: 'test_gauge', help: 'A test gauge', async collect() {
                    await new Promise((resolve) => {
                        setTimeout(resolve, 10);
                    });
                    (this as unknown as Gauge).set(20); // `this` is the gauge instance
                }});
                const metricValues = await instance.getMetricValues('ghost_test_gauge');
                assert.deepEqual(metricValues, [{value: 20, labels: {}}]);
            });
        });

        describe('registerSummary', function () {
            it('should add the summary metric to the registry', function () {
                instance = new PrometheusClient();
                instance.init();
                instance.registerSummary({name: 'test_summary', help: 'A test summary'});
                const metric = instance.getMetric('ghost_test_summary');
                assert.ok(metric);
            });

            it('should return the summary metric', function () {
                instance = new PrometheusClient();
                instance.init();
                const summary = instance.registerSummary({name: 'test_summary', help: 'A test summary'});
                const metric = instance.getMetric('ghost_test_summary');
                assert.equal(metric, summary);
            });

            it('can observe a value', async function () {
                instance = new PrometheusClient();
                instance.init();
                const summary = instance.registerSummary({name: 'test_summary', help: 'A test summary'});
                summary.observe(10);
                const metricValues = await instance.getMetricValues('ghost_test_summary');
                assert.deepEqual(metricValues, [
                    {labels: {quantile: 0.5}, value: 10},
                    {labels: {quantile: 0.9}, value: 10},
                    {labels: {quantile: 0.99}, value: 10},
                    {metricName: 'ghost_test_summary_sum', labels: {}, value: 10},
                    {metricName: 'ghost_test_summary_count', labels: {}, value: 1}
                ]);
            });

            it('can use the collect function to set the summary value', async function () {
                instance = new PrometheusClient();
                instance.init();
                instance.registerSummary({name: 'test_summary', help: 'A test summary', collect() {
                    (this as unknown as Summary).observe(20);
                }});
                const metricValues = await instance.getMetricValues('ghost_test_summary');
                assert.deepEqual(metricValues, [
                    {labels: {quantile: 0.5}, value: 20},
                    {labels: {quantile: 0.9}, value: 20},
                    {labels: {quantile: 0.99}, value: 20},
                    {metricName: 'ghost_test_summary_sum', labels: {}, value: 20},
                    {metricName: 'ghost_test_summary_count', labels: {}, value: 1}
                ]);
            });

            it('can use an async collect function to set the summary value', async function () {
                instance = new PrometheusClient();
                instance.init();
                instance.registerSummary({name: 'test_summary', help: 'A test summary', async collect() {
                    await new Promise((resolve) => {
                        setTimeout(resolve, 10);
                    });
                    (this as unknown as Summary).observe(30);
                }});
                const metricValues = await instance.getMetricValues('ghost_test_summary');
                assert.deepEqual(metricValues, [
                    {labels: {quantile: 0.5}, value: 30},
                    {labels: {quantile: 0.9}, value: 30},
                    {labels: {quantile: 0.99}, value: 30},
                    {metricName: 'ghost_test_summary_sum', labels: {}, value: 30},
                    {metricName: 'ghost_test_summary_count', labels: {}, value: 1}
                ]);
            });

            it('can use the percentiles option to set the summary value', async function () {
                instance = new PrometheusClient();
                instance.init();
                instance.registerSummary({name: 'test_summary', help: 'A test summary', percentiles: [0.1, 0.5, 0.9]});
                const metricValues = await instance.getMetricValues('ghost_test_summary');
                assert.deepEqual(metricValues, [
                    {labels: {quantile: 0.1}, value: 0},
                    {labels: {quantile: 0.5}, value: 0},
                    {labels: {quantile: 0.9}, value: 0},
                    {metricName: 'ghost_test_summary_sum', labels: {}, value: 0},
                    {metricName: 'ghost_test_summary_count', labels: {}, value: 0}
                ]);
            });

            it('can use a timer to observe the summary value', async function () {
                instance = new PrometheusClient();
                instance.init();
                const summary = instance.registerSummary({name: 'test_summary', help: 'A test summary', percentiles: [0.1, 0.5, 0.9]});
                const clock = sinon.useFakeTimers();
                const timer = summary.startTimer();
                clock.tick(1000);
                timer();
                const metricValues = await instance.getMetricValues('ghost_test_summary');
                assert.deepEqual(metricValues, [
                    {labels: {quantile: 0.1}, value: 1},
                    {labels: {quantile: 0.5}, value: 1},
                    {labels: {quantile: 0.9}, value: 1},
                    {metricName: 'ghost_test_summary_sum', labels: {}, value: 1},
                    {metricName: 'ghost_test_summary_count', labels: {}, value: 1}
                ]);

                clock.restore();
            });
        });

        describe('registerHistogram', function () {
            it('should add the histogram metric to the registry', function () {
                instance = new PrometheusClient();
                instance.init();
                instance.registerHistogram({name: 'test_histogram', help: 'A test histogram', buckets: [1, 2, 3]});
                const metric = instance.getMetric('ghost_test_histogram');
                assert.ok(metric);
            });

            it('should return the histogram metric', function () {
                instance = new PrometheusClient();
                instance.init();
                const histogram = instance.registerHistogram({name: 'test_histogram', help: 'A test histogram', buckets: [1, 2, 3]});
                const metric = instance.getMetric('ghost_test_histogram');
                assert.equal(metric, histogram);
            });

            it('can observe a value', async function () {
                instance = new PrometheusClient();
                instance.init();
                const histogram = instance.registerHistogram({name: 'test_histogram', help: 'A test histogram', buckets: [1, 2, 3]});
                histogram.observe(1);
                histogram.observe(2);
                histogram.observe(3);
                const metricValues = await instance.getMetricValues('ghost_test_histogram');
                assert.deepEqual(metricValues, [
                    {
                        exemplar: null,
                        labels: {
                            le: 1
                        },
                        metricName: 'ghost_test_histogram_bucket',
                        value: 1
                    },
                    {
                        exemplar: null,
                        labels: {
                            le: 2
                        },
                        metricName: 'ghost_test_histogram_bucket',
                        value: 2
                    },
                    {
                        exemplar: null,
                        labels: {
                            le: 3
                        },
                        metricName: 'ghost_test_histogram_bucket',
                        value: 3
                    },
                    {
                        exemplar: null,
                        labels: {
                            le: '+Inf'
                        },
                        metricName: 'ghost_test_histogram_bucket',
                        value: 3
                    },
                    {
                        exemplar: undefined,
                        labels: {},
                        metricName: 'ghost_test_histogram_sum',
                        value: 6
                    },
                    {
                        exemplar: undefined,
                        labels: {},
                        metricName: 'ghost_test_histogram_count',
                        value: 3
                    }
                ]);
            });

            it('can use a timer to observe the histogram value', async function () {
                instance = new PrometheusClient();
                instance.init();
                const histogram = instance.registerHistogram({name: 'test_histogram', help: 'A test histogram', buckets: [1000, 2000, 3000]});
                const clock = sinon.useFakeTimers();
                // Observe a value of 1 second
                const timer1 = histogram.startTimer();
                clock.tick(1000);
                timer1();

                // Observe a value of 2 seconds
                const timer2 = histogram.startTimer();
                clock.tick(2000);
                timer2();

                const metricValues = await instance.getMetricValues('ghost_test_histogram');
                assert.deepEqual(metricValues, [
                    {
                        exemplar: null,
                        labels: {
                            le: 1000
                        },
                        metricName: 'ghost_test_histogram_bucket',
                        value: 2
                    },
                    {
                        exemplar: null,
                        labels: {
                            le: 2000
                        },
                        metricName: 'ghost_test_histogram_bucket',
                        value: 2
                    },
                    {
                        exemplar: null,
                        labels: {
                            le: 3000
                        },
                        metricName: 'ghost_test_histogram_bucket',
                        value: 2
                    },
                    {
                        exemplar: null,
                        labels: {
                            le: '+Inf'
                        },
                        metricName: 'ghost_test_histogram_bucket',
                        value: 2
                    },
                    {
                        exemplar: undefined,
                        labels: {},
                        metricName: 'ghost_test_histogram_sum',
                        value: 3
                    },
                    {
                        exemplar: undefined,
                        labels: {},
                        metricName: 'ghost_test_histogram_count',
                        value: 2
                    }
                ]);

                clock.restore();
            });
        });
    });
});
