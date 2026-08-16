const config = require('../../../../shared/config');

/**
 * Stripe client options for machine-payments preview APIs.
 * Honours STRIPE_API_HOST/PORT/PROTOCOL so E2E can point at the fake Stripe
 * server instead of api.stripe.com (same contract as stripe-api.js).
 */
export function getMachinePaymentsStripeOptions(apiVersion: string): Record<string, unknown> {
    const options: Record<string, unknown> = {apiVersion};

    const host = config.get('STRIPE_API_HOST');
    if (host) {
        options.host = host;
    }

    const port = config.get('STRIPE_API_PORT');
    if (port !== undefined && port !== null && port !== '') {
        options.port = parseInt(String(port), 10);
    }

    const protocol = config.get('STRIPE_API_PROTOCOL');
    if (protocol) {
        options.protocol = protocol;
    }

    return options;
}
