const config = require('./config');

let prometheusClient;

// The library is loaded only where metrics are enabled: nothing else in Ghost needs it.
if (!prometheusClient && config.get('prometheus:enabled')) {
  const { PrometheusClient } = require('@tryghost/prometheus-metrics');
  const pushgatewayConfig = config.get('prometheus:pushgateway');
  const prometheusConfig = { pushgateway: pushgatewayConfig };
  prometheusClient = new PrometheusClient(prometheusConfig);
  prometheusClient.init();
}

module.exports = prometheusClient;
