const _ = require('lodash');
const path = require('path');
const semver = require('semver');
const debug = require('@tryghost/debug')('error-handler');
const errors = require('@tryghost/errors');
const {prepareStackForUser} = require('@tryghost/errors').utils;
const {isReqResUserSpecific, cacheControlValues} = require('@tryghost/http-cache-utils');
const tpl = require('@tryghost/tpl');

const messages = {
    genericError: 'An unexpected error occurred, please try again.',
    pageNotFound: 'Page not found',
    resourceNotFound: 'Resource not found',
    methodNotAcceptableVersionAhead: {
        message: 'Request could not be served, the endpoint was not found.',
        context: 'Provided client accept-version {acceptVersion} is ahead of current Ghost version {ghostVersion}.',
        help: 'Try upgrading your Ghost install.'
    },
    methodNotAcceptableVersionBehind: {
        message: 'Request could not be served, the endpoint was not found.',
        context: 'Provided client accept-version {acceptVersion} is behind current Ghost version {ghostVersion}.',
        help: 'Try upgrading your Ghost API client.'
    },
    actions: {
        images: {
            upload: 'upload image'
        }
    },
    userMessages: {
        BookshelfRelationsError: 'Database error, cannot {action}.',
        InternalServerError: 'Internal server error, cannot {action}.',
        IncorrectUsageError: 'Incorrect usage error, cannot {action}.',
        NotFoundError: 'Resource not found error, cannot {action}.',
        BadRequestError: 'Request not understood error, cannot {action}.',
        UnauthorizedError: 'Authorisation error, cannot {action}.',
        NoPermissionError: 'Permission error, cannot {action}.',
        ValidationError: 'Validation error, cannot {action}.',
        UnsupportedMediaTypeError: 'Unsupported media error, cannot {action}.',
        TooManyRequestsError: 'Too many requests error, cannot {action}.',
        MaintenanceError: 'Server down for maintenance, cannot {action}.',
        MethodNotAllowedError: 'Method not allowed, cannot {action}.',
        RequestEntityTooLargeError: 'Request too large, cannot {action}.',
        TokenRevocationError: 'Token is not available, cannot {action}.',
        VersionMismatchError: 'Version mismatch error, cannot {action}.',
        DataExportError: 'Error exporting content.',
        DataImportError: 'Duplicated entry, cannot save {action}.',
        DatabaseVersionError: 'Database version compatibility error, cannot {action}.',
        EmailError: 'Error sending email!',
        ThemeValidationError: 'Theme validation error, cannot {action}.',
        HostLimitError: 'Host Limit error, cannot {action}.',
        DisabledFeatureError: 'Theme validation error, the {{{helperName}}} helper is not available. Cannot {action}.',
        UpdateCollisionError: 'Saving failed! Someone else is editing this post.'
    },
    UnknownError: 'Unknown error - {name}, cannot {action}.'
};

function isDependencyInStack(dependency, err) {
    const dependencyPath = path.join('node_modules', dependency);

    return err?.stack?.match(dependencyPath);
}

/**
 * Get an error ready to be shown the the user
 */
module.exports.prepareError = (err, req, res, next) => {
    debug(err);

    if (Array.isArray(err)) {
        err = err[0];
    }

    // If the error is already a GhostError, it has been handled and can be returned as-is
    // For everything else, we do some custom handling here
    if (!errors.utils.isGhostError(err)) {
        // Catch bookshelf empty errors and other 404s, and turn into a Ghost 404
        if ((err.statusCode && err.statusCode === 404) || err.message === 'EmptyResponse') {
            err = new errors.NotFoundError({
                err: err
            });
        // Catch handlebars / express-hbs errors, and render them as 400, rather than 500 errors as the server isn't broken
        } else if (isDependencyInStack('handlebars', err) || isDependencyInStack('express-hbs', err)) {
            // Temporary handling of theme errors from handlebars
            // @TODO remove this when #10496 is solved properly
            err = new errors.IncorrectUsageError({
                err: err,
                message: err.message,
                statusCode: err.statusCode
            });
        // Catch database errors and turn them into 500 errors, but log some useful data to sentry
        } else if (isDependencyInStack('mysql2', err)) {
            // we don't want to return raw database errors to our users
            err.sqlErrorCode = err.code;
            err = new errors.InternalServerError({
                err: err,
                message: tpl(messages.genericError),
                statusCode: err.statusCode,
                code: 'UNEXPECTED_ERROR'
            });
        // For everything else, create a generic 500 error, with context set to the original error message        
        } else {
            err = new errors.InternalServerError({
                err: err,
                message: tpl(messages.genericError),
                context: err.message,
                statusCode: err.statusCode,
                code: 'UNEXPECTED_ERROR'
            });
        }
    }

    // used for express logging middleware see core/server/app.js
    req.err = err;

    // alternative for res.status();
    res.statusCode = err.statusCode;

    next(err);
};

module.exports.prepareStack = (err, req, res, next) => { // eslint-disable-line no-unused-vars
    const clonedError = prepareStackForUser(err);

    next(clonedError);
};

/**
 * @private the method is exposed for testing purposes only
 * @param {Object} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
module.exports.jsonErrorRenderer = (err, req, res, next) => { // eslint-disable-line no-unused-vars
    const userError = prepareUserMessage(err, req);

    res.json({
        errors: [{
            message: userError.message,
            context: userError.context || null,
            type: err.errorType || null,
            details: err.errorDetails || null,
            property: err.property || null,
            help: err.help || null,
            code: err.code || null,
            id: err.id || null,
            ghostErrorCode: err.ghostErrorCode || null
        }]
    });
};

/**
 *
 * @param {String} [cacheControlHeaderValue] cache-control header value
 */
module.exports.prepareErrorCacheControl = (cacheControlHeaderValue) => {
    return (err, req, res, next) => {
        let cacheControl = cacheControlHeaderValue;
        if (!cacheControlHeaderValue) {
            // never cache errors unless it's a 404
            cacheControl = cacheControlValues.private;

            // Do not include 'private' cache-control directive for 404 responses
            if (err.statusCode === 404 && req.method === 'GET' && !isReqResUserSpecific(req, res)) {
                cacheControl = cacheControlValues.noCacheDynamic;
            }
        }

        res.set({
            'Cache-Control': cacheControl
        });

        next(err);
    };
};

const prepareUserMessage = (err, req) => {
    const userError = {
        message: err.message,
        context: err.context
    };

    const docName = _.get(req, 'frameOptions.docName');
    const method = _.get(req, 'frameOptions.method');

    if (docName && method) {
        let action;

        const actionMap = {
            browse: 'list',
            read: 'read',
            add: 'save',
            edit: 'edit',
            destroy: 'delete'
        };

        if (_.get(messages.actions, [docName, method])) {
            action = tpl(messages.actions[docName][method]);
        } else if (Object.keys(actionMap).includes(method)) {
            let resource = docName;

            if (method !== 'browse') {
                resource = resource.replace(/s$/, '');
            }

            action = `${actionMap[method]} ${resource}`;
        }

        if (action) {
            if (err.context) {
                userError.context = `${err.message} ${err.context}`;
            } else {
                userError.context = err.message;
            }

            if (_.get(messages.userMessages, err.name)) {
                userError.message = tpl(messages.userMessages[err.name], {action: action});
            } else {
                userError.message = tpl(messages.UnknownError, {action, name: err.name});
            }
        }
    }

    return userError;
};

module.exports.resourceNotFound = (req, res, next) => {
    if (req && req.headers && req.headers['accept-version']
        && res.locals && res.locals.safeVersion
        && semver.compare(semver.coerce(req.headers['accept-version']), semver.coerce(res.locals.safeVersion)) !== 0) {
        const versionComparison = semver.compare(
            semver.coerce(req.headers['accept-version']),
            semver.coerce(res.locals.safeVersion)
        );

        let notAcceptableError;
        if (versionComparison === 1) {
            notAcceptableError = new errors.RequestNotAcceptableError({
                message: tpl(
                    messages.methodNotAcceptableVersionAhead.message
                ),
                context: tpl(messages.methodNotAcceptableVersionAhead.context, {
                    acceptVersion: req.headers['accept-version'],
                    ghostVersion: `v${res.locals.safeVersion}`
                }),
                help: tpl(messages.methodNotAcceptableVersionAhead.help),
                code: 'UPDATE_GHOST'
            });
        } else {
            notAcceptableError = new errors.RequestNotAcceptableError({
                message: tpl(
                    messages.methodNotAcceptableVersionBehind.message
                ),
                context: tpl(messages.methodNotAcceptableVersionBehind.context, {
                    acceptVersion: req.headers['accept-version'],
                    ghostVersion: `v${res.locals.safeVersion}`
                }),
                help: tpl(messages.methodNotAcceptableVersionBehind.help),
                code: 'UPDATE_CLIENT'
            });
        }

        next(notAcceptableError);
    } else {
        next(new errors.NotFoundError({message: tpl(messages.resourceNotFound)}));
    }
};

module.exports.pageNotFound = (req, res, next) => {
    next(new errors.NotFoundError({message: tpl(messages.pageNotFound)}));
};

module.exports.handleJSONResponse = sentry => [
    // Make sure the error can be served
    module.exports.prepareError,
    // Add cache-control header
    module.exports.prepareErrorCacheControl(),
    // Handle the error in Sentry
    sentry.errorHandler,
    // Format the stack for the user
    module.exports.prepareStack,
    // Render the error using JSON format
    module.exports.jsonErrorRenderer
];

module.exports.handleHTMLResponse = sentry => [
    // Make sure the error can be served
    module.exports.prepareError,
    // Add cache-control header
    module.exports.prepareErrorCacheControl(cacheControlValues.private),
    // Handle the error in Sentry
    sentry.errorHandler,
    // Format the stack for the user
    module.exports.prepareStack
];
