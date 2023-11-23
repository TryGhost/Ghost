const config = require('./config');
const sentryConfig = config.get('sentry');
const errors = require('@tryghost/errors');

const beforeSend = function (event, hint) {
    try {
        const exception = hint.originalException;
        const code = (exception && exception.code) ? exception.code : null;
        const context = (exception && exception.context) ? exception.context : null;
        const errorType = (exception && exception.errorType) ? exception.errorType : null;
        const id = (exception && exception.id) ? exception.id : null;
        const statusCode = (exception && exception.statusCode) ? exception.statusCode : null;
        event.tags = event.tags || {};

        if (errors.utils.isGhostError(exception)) {
            // Unexpected errors have a generic error message, set it back to context if there is one
            if (code === 'UNEXPECTED_ERROR' && context !== null) {
                if (event.exception.values && event.exception.values.length > 0) {
                    event.exception.values[0].type = context;
                }
            }

            // This is a mysql2 error — add some additional context
            if (exception.sql) {
                const sql = exception.sql;
                const errno = exception.errno ? exception.errno : null;
                const sqlErrorCode = exception.sqlErrorCode ? exception.sqlErrorCode : null;
                const sqlMessage = exception.sqlMessage ? exception.sqlMessage : null;
                const sqlState = exception.sqlState ? exception.sqlState : null;
                if (event.exception.values && event.exception.values.length > 0) {
                    event.exception.values[0].type = `SQL Error ${errno}: ${sqlErrorCode}`;
                    event.exception.values[0].value = sqlMessage;
                    event.contexts = event.contexts || {};
                    event.contexts.mysql = {
                        errno: errno,
                        code: sqlErrorCode,
                        sql: sql,
                        message: sqlMessage,
                        state: sqlState
                    };
                }
            }

            // This is a Ghost Error, copy all our extra data to tags
            event.tags.type = errorType;
            event.tags.code = code;
            event.tags.id = id;
            event.tags.status_code = statusCode;
        }
        return event;
    } catch (error) {
        // If any errors occur in beforeSend, send the original event to Sentry
        // Better to have some information than no information
        return event;
    }
};

if (sentryConfig && !sentryConfig.disabled) {
    const Sentry = require('@sentry/node');
    const version = require('@tryghost/version').full;
    const environment = config.get('env');
    Sentry.init({
        dsn: sentryConfig.dsn,
        release: 'ghost@' + version,
        environment: environment,
        maxValueLength: 1000,
        beforeSend: beforeSend
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
        captureException: Sentry.captureException,
        beforeSend: beforeSend
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
