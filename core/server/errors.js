var _ = require('lodash'),
    uuid = require('uuid'),
    util = require('util');

function GhostError(options) {
    options = options || {};
    var self = this;

    if (_.isString(options)) {
        throw new Error('Please instantiate Errors with the option pattern. e.g. new errors.GhostError({message: ...})');
    }

    Error.call(this);
    Error.captureStackTrace(this, GhostError);

    /**
     * defaults
     */
    this.statusCode = 500;
    this.errorType = 'InternalServerError';
    this.level = 'normal';
    this.id = uuid.v1();

    /**
     * custom overrides
     */
    this.statusCode = options.statusCode || this.statusCode;
    this.level = options.level || this.level;
    this.context = options.context || this.context;
    this.help = options.help || this.help;
    this.errorType = this.name = options.errorType || this.errorType;
    this.errorDetails = options.errorDetails;
    this.code = options.code || null;

    // @TODO: ?
    this.property = options.property;
    this.value = options.value;

    this.message = options.message;
    this.hideStack = options.hideStack;

    // error to inherit from, override!
    // nested objects are getting copied over in one piece (can be changed, but not needed right now)
    if (options.err) {
        // it can happen that third party libs return errors as strings, yes really
        // we are creating an error stack from this line, but we need to ensure not loosing the original error message
        if (_.isString(options.err)) {
            options.err = new Error(options.err);
        }

        Object.getOwnPropertyNames(options.err).forEach(function (property) {
            // original message is part of the stack, no need to pick it
            if (['errorType', 'name', 'statusCode'].indexOf(property) !== -1) {
                return;
            }

            if (property === 'message' && !self[property]) {
                self[property] = options.err[property];
                return;
            }

            if (property === 'stack') {
                self[property] += '\n\n' + options.err[property];
                return;
            }

            self[property] = options.err[property] || self[property];
        });
    }
}

// jscs:disable
var errors = {
    DataExportError: function DataExportError(options) {
        GhostError.call(this, _.merge({
            statusCode: 500,
            errorType: 'DataExportError'
        }, options));
    },
    DataImportError: function DataImportError(options) {
        GhostError.call(this, _.merge({
            statusCode: 500,
            errorType: 'DataImportError'
        }, options));
    },
    IncorrectUsageError: function IncorrectUsageError(options) {
        GhostError.call(this, _.merge({
            statusCode: 400,
            level: 'critical',
            errorType: 'IncorrectUsageError'
        }, options));
    },
    NotFoundError: function NotFoundError(options) {
        GhostError.call(this, _.merge({
            statusCode: 404,
            errorType: 'NotFoundError'
        }, options));
    },
    BadRequestError: function BadRequestError(options) {
        GhostError.call(this, _.merge({
            statusCode: 400,
            errorType: 'BadRequestError'
        }, options));
    },
    DatabaseVersionError: function DatabaseVersionError(options) {
        GhostError.call(this, _.merge({
            hideStack: true,
            statusCode: 500,
            errorType: 'DatabaseVersionError'
        }, options));
    },
    DatabaseNotPopulatedError: function DatabaseNotPopulatedError(options) {
        GhostError.call(this, _.merge({
            statusCode: 500,
            errorType: 'DatabaseNotPopulatedError'
        }, options));
    },
    DatabaseNotSeededError: function DatabaseNotSeededError(options) {
        GhostError.call(this, _.merge({
            statusCode: 500,
            errorType: 'DatabaseNotSeededError'
        }, options));
    },
    UnauthorizedError: function UnauthorizedError(options) {
        GhostError.call(this, _.merge({
            statusCode: 401,
            errorType: 'UnauthorizedError'
        }, options));
    },
    NoPermissionError: function NoPermissionError(options) {
        GhostError.call(this, _.merge({
            statusCode: 403,
            errorType: 'NoPermissionError'
        }, options));
    },
    ValidationError: function ValidationError(options) {
        GhostError.call(this, _.merge({
            statusCode: 422,
            errorType: 'ValidationError'
        }, options));
    },
    UnsupportedMediaTypeError: function UnsupportedMediaTypeError(options) {
        GhostError.call(this, _.merge({
            statusCode: 415,
            errorType: 'UnsupportedMediaTypeError'
        }, options));
    },
    VersionMismatchError: function VersionMismatchError(options) {
        GhostError.call(this, _.merge({
            statusCode: 400,
            errorType: 'VersionMismatchError'
        }, options));
    },
    TokenRevocationError: function TokenRevocationError(options) {
        GhostError.call(this, _.merge({
            statusCode: 503,
            errorType: 'TokenRevocationError'
        }, options));
    },
    EmailError: function EmailError(options) {
        GhostError.call(this, _.merge({
            statusCode: 500,
            errorType: 'EmailError'
        }, options));
    },
    TooManyRequestsError: function TooManyRequestsError(options) {
        GhostError.call(this, _.merge({
            statusCode: 429,
            errorType: 'TooManyRequestsError'
        }, options));
    },
    MaintenanceError: function MaintenanceError(options) {
        GhostError.call(this, _.merge({
            statusCode: 503,
            errorType: 'MaintenanceError'
        }, options));
    },
    ThemeValidationError: function ThemeValidationError(options) {
        GhostError.call(this, _.merge({
            statusCode: 422,
            errorType: 'ThemeValidationError',
            errorDetails: {}
        }, options));
    }
};

util.inherits(GhostError, Error);
_.each(errors, function (error) {
    util.inherits(error, GhostError);
});

module.exports = errors;
module.exports.GhostError = GhostError;


