const {PrometheusClient} = require('@tryghost/prometheus-metrics');

let prometheusClient;

if (!prometheusClient) {
    prometheusClient = new PrometheusClient();
    prometheusClient.init();
}

module.exports = prometheusClient;
