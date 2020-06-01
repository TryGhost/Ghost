const config = require('./config');
const sentryConfig = config.get('sentry');
const errors = require('@tryghost/errors');

const expressNoop = function (req, res, next) {
    next();
};

if (sentryConfig && !sentryConfig.disabled) {
    const Sentry = require('@sentry/node');
    const version = require('../server/lib/ghost-version').full;
    const environment = config.get('env');
    Sentry.init({
        dsn: sentryConfig.dsn,
        release: 'ghost@' + version,
        environment: environment
    });

    module.exports = {
        requestHandler: Sentry.Handlers.requestHandler(),
        errorHandler: Sentry.Handlers.errorHandler({
            shouldHandleError(error) {
                // Sometimes non-Ghost issues will come into here but they won't
                // have a statusCode so we should always handle them
                if (!errors.utils.isIgnitionError(error)) {
                    return true;
                }

                // Only handle 500 errors for now
                // This is because the only other 5XX error should be 503, which are deliberate maintenance/boot errors
                return (error.statusCode === 500);
            }
        }),
        captureException: Sentry.captureException
    };
} else {
    module.exports = {
        requestHandler: expressNoop,
        errorHandler: expressNoop,
        captureException: () => {}
    };
}
