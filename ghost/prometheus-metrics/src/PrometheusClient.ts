import {Request, Response} from 'express';
import client from 'prom-client';

type PrometheusClientConfig = {
    register?: client.Registry;
    pushgateway?: {
        enabled: boolean;
        url: string;
        interval: number;
    }
};
export class PrometheusClient {
    constructor(prometheusConfig: PrometheusClientConfig = {}) {
        this.config = prometheusConfig;
        this.client = client;
        this.prefix = 'ghost_';
        this.register = this.config.register || client.register;
    }

    public client;
    private config: PrometheusClientConfig;
    private prefix;
    private register: client.Registry;

    init() {
        this.collectDefaultMetrics();
    }

    collectDefaultMetrics() {
        this.client.collectDefaultMetrics({prefix: this.prefix, register: this.register});
    }

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

    async getMetrics() {
        return this.register.metrics();
    }

    getContentType() {
        return this.register.contentType;
    }
}
