const {PrometheusClient} = require('@tryghost/prometheus-metrics');
const config = require('./config');

let prometheusClient;

if (!prometheusClient && config.get('prometheus:enabled')) {
    const pushgatewayConfig = config.get('prometheus:pushgateway');
    const prometheusConfig = {pushgateway: pushgatewayConfig};
    prometheusClient = new PrometheusClient(prometheusConfig);
    prometheusClient.init();
}

module.exports = prometheusClient;
