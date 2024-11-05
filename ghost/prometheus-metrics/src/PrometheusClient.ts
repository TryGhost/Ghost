import {Request, Response} from 'express';
import client from 'prom-client';
export class PrometheusClient {
    constructor({register}: {register?: client.Registry} = {}) {
        this.client = client;
        this.prefix = 'ghost_';
        this.register = register || undefined;
    }

    public client;
    private prefix;
    private register: client.Registry | undefined;

    init() {
        this.collectDefaultMetrics();
    }

    collectDefaultMetrics() {
        const metricsConfig: {prefix: string, register?: client.Registry} = {
            prefix: this.prefix
        };
        if (this.register) {
            metricsConfig.register = this.register;
        }
        this.client.collectDefaultMetrics(metricsConfig);
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

    getRegister() {
        return this.register || this.client.register;
    }

    getContentType() {
        return this.getRegister().contentType;
    }
}
