class PrometheusClient {
    constructor() {
        this.client = require('prom-client');
        this.prefix = 'ghost_';
        this.collectDefaultMetrics();
    }

    collectDefaultMetrics() {
        this.client.collectDefaultMetrics({prefix: this.prefix});
    }

    async handleMetricsRequest(req, res) {
        try {
            res.set('Content-Type', this.getContentType());
            res.end(await this.getMetrics());
        } catch (err) {
            res.status(500).end(err.message);
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

// Create a singleton instance and export it as the default export
const prometheusClient = new PrometheusClient();
module.exports = prometheusClient;
