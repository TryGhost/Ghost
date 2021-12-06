const uuid = require('uuid');
const merge = require('lodash/merge');
const isString = require('lodash/isString');
const cloneDeep = require('lodash/cloneDeep');
const utils = require('./utils');

class GhostError extends Error {
    constructor(options) {
        options = options || {};

        super();

        /**
         * defaults
         */
        this.statusCode = 500;
        this.errorType = 'InternalServerError';
        this.level = 'normal';
        this.message = 'The server has encountered an error.';
        this.id = uuid.v1();

        /**
         * custom overrides
         */
        this.id = options.id || this.id;
        this.statusCode = options.statusCode || this.statusCode;
        this.level = options.level || this.level;
        this.context = options.context || this.context;
        this.help = options.help || this.help;
        this.errorType = this.name = options.errorType || this.errorType;
        this.errorDetails = options.errorDetails;
        // @ts-ignore
        this.code = options.code || null;
        this.property = options.property || null;
        this.redirect = options.redirect || null;

        this.message = options.message || this.message;
        this.hideStack = options.hideStack;

        // NOTE: Error to inherit from, override!
        //       Nested objects are getting copied over in one piece (can be changed, but not needed right now)
        if (options.err) {
            // CASE: Support err as string (it happens that third party libs return a string instead of an error instance)
            if (isString(options.err)) {
                /* eslint-disable no-restricted-syntax */
                options.err = new Error(options.err);
                /* eslint-enable no-restricted-syntax */
            }

            Object.getOwnPropertyNames(options.err).forEach((property) => {
                if (['errorType', 'name', 'statusCode', 'message', 'level'].indexOf(property) !== -1) {
                    return;
                }

                // CASE: `code` should put options as priority over err
                if (property === 'code') {  
                    // @ts-ignore
                    this[property] = this[property] || options.err[property];
                    return;
                }

                if (property === 'stack') {
                    if (this.hideStack) {
                        return;
                    }
                    this[property] = utils.wrapStack(this, options.err);
                    return;
                }

                this[property] = options.err[property] || this[property];
            });
        }
    }

    prepareErrorForUser() {
        const error = cloneDeep(this);

        let stackbits = error.stack.split(/\n/);
    
        // We build this up backwards, so we always insert at position 1
    
        if (process.env.NODE_ENV === 'production') {
            stackbits.splice(1, stackbits.length - 1);
        } else {
            // Clearly mark the strack trace
            stackbits.splice(1, 0, `Stack Trace:`);
        }
    
        // Add in our custom cotext and help methods
    
        if (this.help) {
            stackbits.splice(1, 0, `${this.help}`);
        }
    
        if (this.context) {
            stackbits.splice(1, 0, `${this.context}`);
        }
    
        error.stack = stackbits.join('\n');
        return error;
    }
}

const ghostErrors = {
    InternalServerError: class InternalServerError extends GhostError {
        constructor(options) {
            super(merge({
                statusCode: 500,
                level: 'critical',
                errorType: 'InternalServerError',
                message: 'The server has encountered an error.'
            }, options));
        }
    },
    IncorrectUsageError: class IncorrectUsageError extends GhostError {
        constructor(options) {
            super(merge({
                statusCode: 400,
                level: 'critical',
                errorType: 'IncorrectUsageError',
                message: 'We detected a misuse. Please read the stack trace.'
            }, options));
        }
    },
    NotFoundError: class NotFoundError extends GhostError {
        constructor(options) {
            super(merge({
                statusCode: 404,
                errorType: 'NotFoundError',
                message: 'Resource could not be found.',
                hideStack: true
            }, options));
        }
    },
    BadRequestError: class BadRequestError extends GhostError {
        constructor(options) {
            super(merge({
                statusCode: 400,
                errorType: 'BadRequestError',
                message: 'The request could not be understood.'
            }, options));
        }
    },
    UnauthorizedError: class UnauthorizedError extends GhostError {
        constructor(options) {
            super(merge({
                statusCode: 401,
                errorType: 'UnauthorizedError',
                message: 'You are not authorised to make this request.'
            }, options));
        }
    },
    NoPermissionError: class NoPermissionError extends GhostError {
        constructor(options) {
            super(merge({
                statusCode: 403,
                errorType: 'NoPermissionError',
                message: 'You do not have permission to perform this request.'
            }, options));
        }
    },
    ValidationError: class ValidationError extends GhostError {
        constructor(options) {
            super(merge({
                statusCode: 422,
                errorType: 'ValidationError',
                message: 'The request failed validation.'
            }, options));
        }
    },
    UnsupportedMediaTypeError: class UnsupportedMediaTypeError extends GhostError {
        constructor(options) {
            super(merge({
                statusCode: 415,
                errorType: 'UnsupportedMediaTypeError',
                message: 'The media in the request is not supported by the server.'
            }, options));
        }
    },
    TooManyRequestsError: class TooManyRequestsError extends GhostError {
        constructor(options) {
            super(merge({
                statusCode: 429,
                errorType: 'TooManyRequestsError',
                message: 'Server has received too many similar requests in a short space of time.'
            }, options));
        }
    },
    MaintenanceError: class MaintenanceError extends GhostError {
        constructor(options) {
            super(merge({
                statusCode: 503,
                errorType: 'MaintenanceError',
                message: 'The server is temporarily down for maintenance.'
            }, options));
        }
    },
    MethodNotAllowedError: class MethodNotAllowedError extends GhostError {
        constructor(options) {
            super(merge({
                statusCode: 405,
                errorType: 'MethodNotAllowedError',
                message: 'Method not allowed for resource.'
            }, options));
        }
    },
    RequestEntityTooLargeError: class RequestEntityTooLargeError extends GhostError {
        constructor(options) {
            super(merge({
                statusCode: 413,
                errorType: 'RequestEntityTooLargeError',
                message: 'Request was too big for the server to handle.'
            }, options));
        }
    },
    TokenRevocationError: class TokenRevocationError extends GhostError {
        constructor(options) {
            super(merge({
                statusCode: 503,
                errorType: 'TokenRevocationError',
                message: 'Token is no longer available.'
            }, options));
        }
    },
    VersionMismatchError: class VersionMismatchError extends GhostError {
        constructor(options) {
            super(merge({
                statusCode: 400,
                errorType: 'VersionMismatchError',
                message: 'Requested version does not match server version.'
            }, options));
        }
    },
    DataExportError: class DataExportError extends GhostError {
        constructor(options) {
            super(merge({
                statusCode: 500,
                errorType: 'DataExportError'
            }, options));
        }
    },
    DataImportError: class DataImportError extends GhostError {
        constructor(options) {
            super(merge({
                statusCode: 500,
                errorType: 'DataImportError'
            }, options));
        }
    },
    DatabaseVersionError: class DatabaseVersionError extends GhostError {
        constructor(options) {
            super(merge({
                hideStack: true,
                statusCode: 500,
                errorType: 'DatabaseVersionError'
            }, options));
        }
    },
    EmailError: class EmailError extends GhostError {
        constructor(options) {
            super(merge({
                statusCode: 500,
                errorType: 'EmailError'
            }, options));
        }
    },
    ThemeValidationError: class ThemeValidationError extends GhostError {
        constructor(options) {
            super(merge({
                statusCode: 422,
                errorType: 'ThemeValidationError',
                errorDetails: {}
            }, options));
        }
    },
    DisabledFeatureError: class DisabledFeatureError extends GhostError {
        constructor(options) {
            super(merge({
                statusCode: 409,
                errorType: 'DisabledFeatureError'
            }, options));
        }
    },
    UpdateCollisionError: class UpdateCollisionError extends GhostError {
        constructor(options) {
            super(merge({
                statusCode: 409,
                errorType: 'UpdateCollisionError'
            }, options));
        }
    },
    HostLimitError: class HostLimitError extends GhostError {
        constructor(options) {
            super(merge({
                errorType: 'HostLimitError',
                hideStack: true,
                statusCode: 403
            }, options));
        }
    },
    HelperWarning: class HelperWarning extends GhostError {
        constructor(options) {
            super(merge({
                errorType: 'HelperWarning',
                hideStack: true
            }, options));
        }
    },
    PasswordResetRequiredError: class PasswordResetRequiredError extends GhostError {
        constructor(options) {
            super(merge({
                errorType: 'PasswordResetRequiredError',
                statusCode: 401,
                message: 'For security, you need to create a new password. An email has been sent to you with instructions!'
            }, options));
        }
    },
    UnhandledJobError: class UnhandledJobError extends GhostError {
        constructor(options) {
            super(merge({
                errorType: 'UnhandledJobError',
                message: 'Processed job threw an unhandled error',
                level: 'critical'
            }, options));
        }
    },
    NoContentError: class NoContentError extends GhostError {
        constructor(options) {
            super(merge({
                errorType: 'NoContentError',
                statusCode: 204,
                hideStack: true
            }, options));
        }
    },
    ConflictError: class ConflictError extends GhostError {
        constructor(options) {
            super(merge({
                errorType: 'ConflictError',
                statusCode: 409
            }, options));
        }
    }
};

module.exports = ghostErrors;

const ghostErrorsWithBase = Object.assign({}, ghostErrors, {GhostError});
module.exports.utils = {
    serialize: utils.serialize.bind(ghostErrorsWithBase),
    deserialize: utils.deserialize.bind(ghostErrorsWithBase),
    isGhostError: utils.isGhostError.bind(ghostErrorsWithBase)
};
