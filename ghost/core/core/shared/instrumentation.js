const logging = require('@tryghost/logging');

async function initOpenTelemetry({config}) {
    // Only enable if explicitly enabled via config `opentelemetry:enabled`
    try {
        const enabled = config.get('opentelemetry:enabled');
        if (!enabled) {
            logging.debug('OpenTelemetry is not enabled');
            return false;
        }
        const perf = require('perf_hooks').performance;
        perf.mark('opentelemetry:init:start');
        logging.debug('Initializing OpenTelemetry');
    
        // Lazyloaded to avoid boot time overhead when not enabled
        const {NodeSDK} = require('@opentelemetry/sdk-node');
        const {PrometheusExporter} = require('@opentelemetry/exporter-prometheus');
        const {RuntimeNodeInstrumentation} = require('@opentelemetry/instrumentation-runtime-node');
    
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
        perf.mark('opentelemetry:init:finished');
        logging.debug('OpenTelemetry initialized in', Math.round(perf.measure('opentelemetry:init:duration', 'opentelemetry:init:start', 'opentelemetry:init:finished').duration), 'ms');
        return true;
    } catch (error) {
        logging.error('Error initializing OpenTelemetry', error);
        return false;
    }
}

module.exports = {
    initOpenTelemetry
};
