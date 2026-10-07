export function getSentryTestConfig(transport) {
    return {
        dsn: 'https://abcdef0123456789abcdef0123456789@o12345.ingest.sentry.io/1234567',
        transport,
        environment: 'testing',
        release: 'ghost@5.0.0',
        // tests send identical events back to back
        integrations: integrations => integrations.filter(integration => integration.name !== 'Dedupe')
    };
}
