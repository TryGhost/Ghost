const config = require('./config');
const sentryConfig = config.get('sentry');

const expressNoop = function (req, res, next) {
    next();
};

if (sentryConfig && !sentryConfig.disabled) {
    const Sentry = require('@sentry/node');
    const version = require('../../package.json').version;
    Sentry.init({
        dsn: sentryConfig.dsn,
        release: 'ghost@' + version
    });

    module.exports = {
        requestHandler: Sentry.Handlers.requestHandler(),
        errorHandler: Sentry.Handlers.errorHandler({
            shouldHandleError(error) {
                // Only handle 500 errors for now
                return (error.statusCode === 500);
            }
        })
    };
} else {
    module.exports = {
        requestHandler: expressNoop,
        errorHandler: expressNoop
    };
}
