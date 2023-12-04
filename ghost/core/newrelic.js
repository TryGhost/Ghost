const config = require('./core/shared/config');

exports.config = {
    app_name: ['Ghost'],
    license_key: config.get('newRelic:licenseKey'),
    labels: {
        env: process.env.PRO_ENV || 'unknown',
        site: config.get('hostSettings:siteId')
    },
    // Agent only imported when enabled, but this will further cement that
    agent_enabled: config.get('newRelic:enabled'),
    distributed_tracing: {
        enabled: true
    },
    logging: {
        level: 'info'
    },
    slow_sql: {
        // Default is false.
        enabled: true,
        // Default is 10. Increasing this limit increases memory usage
        // Defines the maximum number of slow queries the agent collects per minute.
        // The agent discards additional queries after the limit is reached.
        max_samples: 10
    },
    error_collector: {
        ignore_classes: [
            // @NOTE: add more error classes to ignore here
            'ValidationError',
            'NoPermissionError'
        ]
    },
    transaction_tracer: {
        enabled: true,
        record_sql: 'obfuscated'
    },
    allow_all_headers: true,
    attributes: {
        exclude: [
            // Default exclusions (TODO: add more!):
            'request.headers.cookie',
            'request.headers.authorization',
            'request.headers.proxyAuthorization',
            'request.headers.setCookie*',
            'request.headers.x*',
            'response.headers.cookie',
            'response.headers.authorization',
            'response.headers.proxyAuthorization',
            'response.headers.setCookie*',
            'response.headers.x*'
        ]
    }
};
