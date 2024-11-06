import {Request, Response} from 'express';
import client from 'prom-client';
import logging from '@tryghost/logging';
import errors from '@tryghost/errors';

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
    constructor(prometheusConfig: PrometheusClientConfig = {}) {
        this.config = prometheusConfig;
        this.client = client;
        this.prefix = 'ghost_';
    }

    public client;
    private config: PrometheusClientConfig;
    private prefix;
    public gateway: client.Pushgateway<client.RegistryContentType> | undefined; // public for testing
    private pushInterval: ReturnType<typeof setInterval> | undefined;

    /**
     * Initializes the prometheus client, setting up the pushgateway if enabled
     */
    init() {
        this.collectDefaultMetrics();
        if (this.config.pushgateway?.enabled) {
            const gatewayUrl = this.config.pushgateway.url || 'http://localhost:9091';
            const interval = this.config.pushgateway.interval || 5000;
            this.gateway = new client.Pushgateway(gatewayUrl);
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
                logging.debug('Metrics pushed to pushgateway - jobName: ', jobName);
            } catch (err) {
                let error;
                if (typeof err === 'object' && err !== null && 'code' in err) {
                    error = new errors.InternalServerError({message: 'Error pushing metrics to pushgateway: ' + err.code, code: err.code as string});
                } else {
                    error = new errors.InternalServerError({message: 'Error pushing metrics to pushgateway: Unknown error'});
                }
                logging.error(error);
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
     * Returns the metrics from the registry
     */
    async getMetrics() {
        return this.client.register.metrics();
    }

    /**
     * Returns the content type for the metrics
     */
    getContentType() {
        return this.client.register.contentType;
    }
}
