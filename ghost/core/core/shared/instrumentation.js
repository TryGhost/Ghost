const perf = require('perf_hooks');
const logging = require('@tryghost/logging');

async function initOpenTelemetry({config}) {
    // Only enable if explicitly enabled via config `opentelemetry:enabled`
    const enabled = config.get('opentelemetry:enabled');
    if (!enabled) {
        return;
    }
    perf.performance.mark('opentelemetry:init:start');
    logging.info('Initializing OpenTelemetry');

    // Lazyloaded to avoid boot time overhead when not enabled
    const {NodeSDK} = require('@opentelemetry/sdk-node');
    const {PrometheusExporter} = require('@opentelemetry/exporter-prometheus');
    const {RuntimeNodeInstrumentation} = require('@opentelemetry/instrumentation-runtime-node');
    perf.performance.mark('opentelemetry:init:packagesLoaded');

    const prometheusExporter = new PrometheusExporter({
        port: config.get('opentelemetry:prometheus:port'),
        startServer: true
    });

    const sdk = new NodeSDK({
        serviceName: 'ghost',
        metricReader: prometheusExporter,
        instrumentations: [
            new RuntimeNodeInstrumentation({
                eventLoopUtilizationMeasurementInterval: 5000
            })
        ]
    });
    sdk.start();
    perf.performance.mark('opentelemetry:init:finished');
    logging.debug('OpenTelemetry initialized in', perf.performance.measure('opentelemetry:init:duration', 'opentelemetry:init:start', 'opentelemetry:init:finished').duration, 'ms');
}

module.exports = {
    initOpenTelemetry
};
