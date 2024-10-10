const config = require('./config');
const logging = require('@tryghost/logging');
const SentryKnexTracingIntegration = require('./SentryKnexTracingIntegration');
const sentryConfig = config.get('sentry');
const errors = require('@tryghost/errors');

/**
 * @param {import('@sentry/node').Event} event
 * @param {import('@sentry/node').EventHint} hint
 * @returns {import('@sentry/node').Event | null}
 */
const beforeSend = function (event, hint) {
    try {
        const exception = hint.originalException;
        const code = exception?.code ?? null;
        const context = exception?.context ?? null;
        const errorType = exception?.errorType ?? null;
        const id = exception?.id ?? null;
        const statusCode = exception?.statusCode ?? null;
        event.tags = event.tags || {};

        if (errors.utils.isGhostError(exception)) {
            // Unexpected errors have a generic error message, set it back to context if there is one
            if (code === 'UNEXPECTED_ERROR' && context !== null) {
                if (event.exception.values?.length > 0) {
                    event.exception.values[0].type = context;
                }
            }

            // This is a mysql2 error — add some additional context
            if (exception.sql) {
                const sql = exception.sql;
                const errno = exception.errno ?? null;
                const sqlErrorCode = exception.sqlErrorCode ?? null;
                const sqlMessage = exception.sqlMessage ?? null;
                const sqlState = exception.sqlState ?? null;

                if (event.exception.values?.length > 0) {
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

            // Only handle 500 errors for now
            // This is because the only other 5XX error should be 503, which are deliberate maintenance/boot errors
            if (statusCode === 500) {
                return event;
            } else {
                return null;
            }
        }
        return event;
    } catch (error) {
        // If any errors occur in beforeSend, send the original event to Sentry
        // Better to have some information than no information
        return event;
    }
};

const ALLOWED_HTTP_TRANSACTIONS = [
    '/ghost/api', // any Ghost API call
    '/members/api', // any Members API call
    '/:slug', // any frontend post/page
    '/author', // any frontend author page
    '/tag' // any frontend tag page
].map((path) => {
    // Sentry names HTTP transactions like: "<HTTP_METHOD> <PATH>" i.e. "GET /ghost/api/content/settings"
    // Match any of the paths above with any HTTP method, and also the homepage "GET /"
    return new RegExp(`^(GET|POST|PUT|DELETE)\\s(?<path>${path}\\/.+|\\/$)`);
});

/**
 * @param {import('@sentry/node').Event} event
 * @returns {import('@sentry/node').Event | null}
 */
const beforeSendTransaction = function (event) {
    // Drop transactions that are not in the allowed list
    for (const transaction of ALLOWED_HTTP_TRANSACTIONS) {
        const match = event.transaction.match(transaction);

        if (match?.groups?.path) {
            return event;
        }
    }

    return null;
};

if (sentryConfig && !sentryConfig.disabled) {
    const Sentry = require('@sentry/node');
    const version = require('@tryghost/version').full;

    let environment = config.get('PRO_ENV');
    if (!environment) {
        environment = config.get('env');
    }

    /** @type {import('@sentry/node').NodeOptions} */
    const sentryInitConfig = {
        dsn: sentryConfig.dsn,
        release: 'ghost@' + version,
        environment: environment,
        maxValueLength: 1000,
        integrations: [
            Sentry.extraErrorDataIntegration()
        ],
        beforeSend,
        beforeSendTransaction
    };

    // Enable tracing if sentry.tracing.enabled is true
    if (sentryConfig.tracing?.enabled === true) {
        sentryInitConfig.integrations.push(new Sentry.Integrations.Http({tracing: true}));
        sentryInitConfig.tracesSampleRate = parseFloat(sentryConfig.tracing.sampleRate) || 0.0;
        // Enable profiling, if configured, only if tracing is also configured
        if (sentryConfig.profiling?.enabled === true) {
            // Import Sentry's profiling integration if available
            let ProfilingIntegration;
            try {
                ({ProfilingIntegration} = require('@sentry/profiling-node'));
            } catch (err) {
                logging.warn('Sentry Profiling Integration not available');
                ProfilingIntegration = null;
            }

            if (ProfilingIntegration) {
                sentryInitConfig.integrations.push(new ProfilingIntegration());
                sentryInitConfig.profilesSampleRate = parseFloat(sentryConfig.profiling.sampleRate) || 0.0;
            }
        }
    }
    Sentry.init(sentryInitConfig);

    module.exports = {
        requestHandler: Sentry.Handlers.requestHandler(),
        errorHandler: Sentry.Handlers.errorHandler(),
        tracingHandler: Sentry.Handlers.tracingHandler(),
        captureException: Sentry.captureException,
        captureMessage: Sentry.captureMessage,
        beforeSend: beforeSend,
        beforeSendTransaction: beforeSendTransaction,
        initQueryTracing: (knex) => {
            if (sentryConfig.tracing?.enabled === true) {
                const integration = new SentryKnexTracingIntegration(knex);

                Sentry.addIntegration(integration);
            }
        }
    };
} else {
    const expressNoop = function (req, res, next) {
        next();
    };

    const noop = () => {};

    module.exports = {
        requestHandler: expressNoop,
        errorHandler: expressNoop,
        tracingHandler: expressNoop,
        captureException: noop,
        initQueryTracing: noop
    };
}
