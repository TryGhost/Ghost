const debug = require('ghost-ignition').debug('stripe-request');
const LeakyBucket = require('leaky-bucket');
const EXPECTED_API_EFFICIENCY = 0.95;
const liveBucket = new LeakyBucket(EXPECTED_API_EFFICIENCY * 100, 1);
const testBucket = new LeakyBucket(EXPECTED_API_EFFICIENCY * 25, 1);

module.exports = function createStripeRequest(makeRequest) {
    return async function stripeRequest(stripe, ...args) {
        const throttledMakeRequest = async (stripe, ...args) => {
            if (stripe.__TEST_MODE__) {
                await testBucket.throttle();
            } else {
                await liveBucket.throttle();
            }
            return await makeRequest(stripe, ...args);
        };
        const errorHandler = (err) => {
            switch (err.type) {
            case 'StripeCardError':
                // Card declined
                debug('StripeCardError');
                throw err;
            case 'RateLimitError':
                // Ronseal
                debug('RateLimitError');
                return exponentiallyBackoff(throttledMakeRequest, stripe, ...args).catch((err) => {
                    // We do not want to recurse further if we get RateLimitError
                    // after running the exponential backoff
                    if (err.type === 'RateLimitError') {
                        throw err;
                    }
                    return errorHandler(err);
                });
            case 'StripeInvalidRequestError':
                debug('StripeInvalidRequestError');
                // Invalid params to the request
                throw err;
            case 'StripeAPIError':
                debug('StripeAPIError');
                // Rare internal server error from stripe
                throw err;
            case 'StripeConnectionError':
                debug('StripeConnectionError');
                // Weird network/https issue
                throw err;
            case 'StripeAuthenticationError':
                debug('StripeAuthenticationError');
                // Invalid API Key (probably)
                throw err;
            default:
                throw err;
            }
        };
        return throttledMakeRequest(stripe, ...args).catch(errorHandler);
    };
};

function exponentiallyBackoff(makeRequest, ...args) {
    function backoffRequest(timeout, ...args) {
        return new Promise(resolve => setTimeout(resolve, timeout)).then(() => {
            return makeRequest(...args).catch((err) => {
                if (err.type !== 'RateLimitError') {
                    throw err;
                }

                if (timeout > 30000) {
                    throw err;
                }

                return backoffRequest(timeout * 2, ...args);
            });
        });
    }

    return backoffRequest(1000, ...args);
}
