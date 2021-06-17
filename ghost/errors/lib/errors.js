const merge = require('lodash/merge');
const each = require('lodash/each');
const util = require('util');
const errors = require('@tryghost/ignition-errors');

class GhostError extends errors.IgnitionError {
    constructor(options) {
        options = options || {};
        super(options);
        this.value = options.value;
    }
}

const ghostErrors = {
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
    }
};

// we need to inherit all general errors from GhostError, otherwise we have to check instanceof IgnitionError
each(errors, function (error) {
    if (error.name === 'IgnitionError' || typeof error === 'object') {
        return;
    }

    util.inherits(error, GhostError);
});

module.exports = merge(ghostErrors, errors);
module.exports.GhostError = GhostError;
