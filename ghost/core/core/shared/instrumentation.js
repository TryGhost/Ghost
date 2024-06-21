async function initOpenTelemetry({config}) {
    // Always enable in development environment
    // In production, only enable if explicitly enabled via config `opentelemetry:enabled`
    // TODO: Instrumentation currently breaks viewing posts - disabled until we can fix
    // const isDevelopment = process.env.NODE_ENV === 'development';
    const isConfigured = config.get('opentelemetry:enabled');
    const enabled = isConfigured; // || isDevelopment;
    if (!enabled) {
        return;
    }
    const collectorOptions = {
        url: config.get('opentelemetry:exporter:endpoint') || 'http://localhost:4318/v1/traces',
        headers: {},
        concurrencyLimit: 10
    };

    // Lazyloaded to avoid boot time overhead when not enabled
    const {NodeSDK} = require('@opentelemetry/sdk-node');
    const {OTLPTraceExporter} = require('@opentelemetry/exporter-trace-otlp-http');
    const {getNodeAutoInstrumentations} = require('@opentelemetry/auto-instrumentations-node');

    const sdk = new NodeSDK({
        serviceName: 'ghost',
        traceExporter: new OTLPTraceExporter(collectorOptions),
        instrumentations: [
            getNodeAutoInstrumentations()
        ]
    });
    sdk.start();
}

module.exports = {
    initOpenTelemetry
};
