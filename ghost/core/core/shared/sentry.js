const config = require('./config');
const sentryConfig = config.get('sentry');
const errors = require('@tryghost/errors');

if (sentryConfig && !sentryConfig.disabled) {
    const Sentry = require('@sentry/node');
    const version = require('@tryghost/version').full;
    const environment = config.get('env');
    Sentry.init({
        dsn: sentryConfig.dsn,
        release: 'ghost@' + version,
        environment: environment,
        maxValueLength: 1000,
        beforeSend: function (event, hint) {
            const exception = hint.originalException;

            event.tags = event.tags || {};

            if (errors.utils.isGhostError(exception)) {
                // Unexpected errors have a generic error message, set it back to context if there is one
                if (exception.code === 'UNEXPECTED_ERROR' && exception.context !== null) {
                    event.exception.values[0].type = exception.context;
                }

                // This is a mysql2 error — add some additional context
                if (exception.sql) {
                    event.exception.values[0].type = `SQL Error ${exception.errno}: ${exception.sqlErrorCode}`;
                    event.exception.values[0].value = exception.sqlMessage;
                    event.contexts.mysql = {
                        errno: exception.errno,
                        code: exception.sqlErrorCode,
                        sql: exception.sql,
                        message: exception.sqlMessage,
                        state: exception.sqlState
                    };
                }

                // This is a Ghost Error, copy all our extra data to tags
                event.tags.type = exception.errorType;
                event.tags.code = exception.code;
                event.tags.id = exception.id;
                event.tags.statusCode = exception.statusCode;
            }
            return event;
        }
    });

    module.exports = {
        requestHandler: Sentry.Handlers.requestHandler(),
        errorHandler: Sentry.Handlers.errorHandler({
            shouldHandleError(error) {
                // Sometimes non-Ghost issues will come into here but they won't
                // have a statusCode so we should always handle them
                if (!errors.utils.isGhostError(error)) {
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
    const expressNoop = function (req, res, next) {
        next();
    };

    const noop = () => {};

    module.exports = {
        requestHandler: expressNoop,
        errorHandler: expressNoop,
        captureException: noop
    };
}
