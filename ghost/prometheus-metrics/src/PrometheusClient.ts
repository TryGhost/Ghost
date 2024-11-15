import {Request, Response} from 'express';
import client from 'prom-client';
import type {Metric, MetricObjectWithValues, MetricValue} from 'prom-client';
import type {Knex} from 'knex';
import logging from '@tryghost/logging';

type PrometheusClientConfig = {
    register?: client.Registry;
    pushgateway?: {
        enabled: boolean;
        url?: string;
        interval?: number;
        jobName?: string;
    }
};

/**
 * A client for exporting metrics to Prometheus, based on prom-client
 */
export class PrometheusClient {
    /**
     * Creates a new PrometheusClient instance
     * @param prometheusConfig - The configuration for the PrometheusClient
     */
    constructor(prometheusConfig: PrometheusClientConfig = {}, logger: any = logging) {
        this.config = prometheusConfig;
        this.client = client;
        this.prefix = 'ghost_';
        this.logger = logger;
    }

    public client;
    public gateway: client.Pushgateway<client.RegistryContentType> | undefined; // public for testing
    public queries: Map<string, Date> = new Map();

    private config: PrometheusClientConfig;
    private prefix;
    private pushInterval: ReturnType<typeof setInterval> | undefined;
    private logger: any;

    /**
     * Initializes the prometheus client, setting up the pushgateway if enabled
     */
    init() {
        this.collectDefaultMetrics();
        if (this.config.pushgateway?.enabled) {
            const gatewayUrl = this.config.pushgateway.url || 'http://localhost:9091';
            const interval = this.config.pushgateway.interval || 5000;
            this.gateway = new client.Pushgateway(gatewayUrl);
            this.pushMetrics();
            this.pushInterval = setInterval(() => {
                this.pushMetrics();
            }, interval);
        }
    }

    /**
     * Pushes metrics to the pushgateway, if enabled
     */
    async pushMetrics() {
        if (this.config.pushgateway?.enabled && this.gateway) {
            const jobName = this.config.pushgateway?.jobName || 'ghost';
            try {
                await this.gateway.pushAdd({jobName});
                this.logger.debug('Metrics pushed to pushgateway - jobName: ', jobName);
            } catch (err) {
                let error;
                if (typeof err === 'object' && err !== null && 'code' in err) {
                    error = 'Error pushing metrics to pushgateway: ' + err.code as string;
                } else {
                    error = 'Error pushing metrics to pushgateway: Unknown error';
                }
                this.logger.error(error);
            }
        }
    }

    /**
     * Shuts down the prometheus client cleanly
     */
    stop() {
        // Clear the push interval
        if (this.pushInterval) {
            clearInterval(this.pushInterval);
        }
    }

    /**
     * Tells prom-client to collect default metrics
     * Only called once on init
     */
    collectDefaultMetrics() {
        this.client.collectDefaultMetrics({prefix: this.prefix});
    }

    /**
     * Handles metrics requests to serve the /metrics endpoint
     * @param req - The request object
     * @param res - The response object
     */
    async handleMetricsRequest(req: Request, res: Response) {
        try {
            res.set('Content-Type', this.getContentType());
            res.end(await this.getMetrics());
        } catch (err) {
            if (err instanceof Error && err.message) {
                res.status(500).end(err.message);
            } else {
                res.status(500).end('Unknown error');
            }
        }
    }

    /**
     * Returns the metrics from the registry as a string
     */
    async getMetrics(): Promise<string> {
        return this.client.register.metrics();
    }

    /**
     * Returns the metrics from the registry as a JSON object
     * 
     * Particularly useful for testing
     */
    async getMetricsAsJSON(): Promise<object[]> {
        return this.client.register.getMetricsAsJSON();
    }

    async getMetricsAsArray(): Promise<object[]> {
        return this.client.register.getMetricsAsArray();
    }

    /**
     * Returns the content type for the metrics
     */
    getContentType() {
        return this.client.register.contentType;
    }

    /**
     * Returns a single metric from the registry
     * @param name - The name of the metric
     * @returns The metric
     */
    getMetric(name: string): Metric | undefined {
        if (!name.startsWith(this.prefix)) {
            name = `${this.prefix}${name}`;
        }
        return this.client.register.getSingleMetric(name);
    }

    /**
     * Returns the metric object of a single metric, if it exists
     * @param name - The name of the metric
     * @returns The values of the metric
     */
    async getMetricObject(name: string): Promise<MetricObjectWithValues<MetricValue<string>> | undefined> {
        const metric = this.getMetric(name);
        if (!metric) {
            return undefined;
        }
        return await metric.get();
    }

    async getMetricValues(name: string): Promise<MetricValue<string>[] | undefined> {
        const metricObject = await this.getMetricObject(name);
        if (!metricObject) {
            return undefined;
        }
        return metricObject.values;
    }

    /**
     * 
     */

    /**
     * Registers a counter metric
     * @param name - The name of the metric
     * @param help - The help text for the metric
     * @returns The counter metric
     */
    registerCounter({name, help}: {name: string, help: string}): client.Counter {
        return new this.client.Counter({
            name: `${this.prefix}${name}`,
            help
        });
    }

    /**
     * Registers a gauge metric
     * @param name - The name of the metric
     * @param help - The help text for the metric
     * @param collect - The collect function to use for the gauge
     * @returns The gauge metric
     */
    registerGauge({name, help, collect}: {name: string, help: string, collect?: () => void}): client.Gauge {
        return new this.client.Gauge({
            name: `${this.prefix}${name}`,
            help,
            collect
        });
    }

    /**
     * Registers a summary metric
     * @param name - The name of the metric
     * @param help - The help text for the metric
     * @param percentiles - The percentiles to calculate for the summary
     * @param collect - The collect function to use for the summary
     * @returns The summary metric
     */
    registerSummary({name, help, percentiles, collect}: {name: string, help: string, percentiles?: number[], collect?: () => void}): client.Summary {
        return new this.client.Summary({
            name: `${this.prefix}${name}`,
            help,
            percentiles: percentiles || [0.5, 0.9, 0.99],
            collect
        });
    }

    /**
     * Registers a histogram metric
     * @param name - The name of the metric
     * @param help - The help text for the metric
     * @param buckets - The buckets to calculate for the histogram
     * @param collect - The collect function to use for the histogram
     * @returns The histogram metric
     */
    registerHistogram({name, help, buckets}: {name: string, help: string, buckets: number[], collect?: () => void}): client.Histogram {
        return new this.client.Histogram({
            name: `${this.prefix}${name}`,
            help,
            buckets: buckets
        });
    }

    // Utility functions for creating custom metrics

    /**
     * Instruments the knex connection pool and queries
     * @param knexInstance - The knex instance
     */
    instrumentKnex(knexInstance: Knex) {
        // Create some gauges for tracking the connection pool
        this.registerGauge({
            name: `db_connection_pool_max`, 
            help: 'The maximum number of connections allowed in the pool', 
            collect() {
                (this as unknown as client.Gauge).set(knexInstance.client.pool.max);
            }
        });

        this.registerGauge({
            name: `db_connection_pool_min`, 
            help: 'The minimum number of connections allowed in the pool',
            collect() {
                (this as unknown as client.Gauge).set(knexInstance.client.pool.min);
            }
        });

        this.registerGauge({
            name: `db_connection_pool_active`, 
            help: 'The number of active connections to the database, which can be in use or idle',
            collect() {
                (this as unknown as client.Gauge).set(knexInstance.client.pool.numUsed() + knexInstance.client.pool.numFree());
            }
        });

        this.registerGauge({
            name: `db_connection_pool_used`,
            help: 'The number of connections currently in use by the database',
            collect() {
                (this as unknown as client.Gauge).set(knexInstance.client.pool.numUsed());
            }
        });

        this.registerGauge({
            name: `db_connection_pool_idle`,
            help: 'The number of active connections currently idle in pool',
            collect() {
                (this as unknown as client.Gauge).set(knexInstance.client.pool.numFree());
            }
        });

        this.registerGauge({
            name: `db_connection_pool_pending_acquires`,
            help: 'The number of connections currently waiting to be acquired from the pool',
            collect() {
                (this as unknown as client.Gauge).set(knexInstance.client.pool.numPendingAcquires());
            }
        });

        this.registerGauge({
            name: `db_connection_pool_pending_creates`,
            help: 'The number of connections currently waiting to be created',
            collect() {
                (this as unknown as client.Gauge).set(knexInstance.client.pool.numPendingCreates());
            }
        });

        this.registerSummary({
            name: `db_query_duration_milliseconds`,
            help: 'The duration of queries in milliseconds',
            percentiles: [0.5, 0.9, 0.99]
        });

        knexInstance.on('query', (query) => {
            // Add the query to the map
            this.queries.set(query.__knexQueryUid, new Date());
        });

        knexInstance.on('query-response', (err, query) => {
            const start = this.queries.get(query.__knexQueryUid);
            if (start) {
                const duration = new Date().getTime() - start.getTime();
                (this.getMetric(`db_query_duration_milliseconds`) as client.Summary).observe(duration);
            }
        });
    }
}
