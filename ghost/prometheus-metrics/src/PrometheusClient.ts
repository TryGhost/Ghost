import {Request, Response} from 'express';

export class PrometheusClient {
    constructor() {
        this.client = require('prom-client');
        this.prefix = 'ghost_';
        this.collectDefaultMetrics();
    }

    public client;
    private prefix;

    collectDefaultMetrics() {
        this.client.collectDefaultMetrics({prefix: this.prefix});
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
        return this.client.register.metrics();
    }

    getRegistry() {
        return this.client.register;
    }

    getContentType() {
        return this.getRegistry().contentType;
    }
}
