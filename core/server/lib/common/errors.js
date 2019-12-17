const merge = require('lodash/merge'),
    each = require('lodash/each'),
    util = require('util'),
    errors = require('ghost-ignition').errors;

function GhostError(options) {
    options = options || {};
    this.value = options.value;

    errors.IgnitionError.call(this, options);
}

const ghostErrors = {
    DataExportError: function DataExportError(options) {
        GhostError.call(this, merge({
            statusCode: 500,
            errorType: 'DataExportError'
        }, options));
    },
    DataImportError: function DataImportError(options) {
        GhostError.call(this, merge({
            statusCode: 500,
            errorType: 'DataImportError'
        }, options));
    },
    DatabaseVersionError: function DatabaseVersionError(options) {
        GhostError.call(this, merge({
            hideStack: true,
            statusCode: 500,
            errorType: 'DatabaseVersionError'
        }, options));
    },
    EmailError: function EmailError(options) {
        GhostError.call(this, merge({
            statusCode: 500,
            errorType: 'EmailError'
        }, options));
    },
    ThemeValidationError: function ThemeValidationError(options) {
        GhostError.call(this, merge({
            statusCode: 422,
            errorType: 'ThemeValidationError',
            errorDetails: {}
        }, options));
    },
    DisabledFeatureError: function DisabledFeatureError(options) {
        GhostError.call(this, merge({
            statusCode: 409,
            errorType: 'DisabledFeatureError'
        }, options));
    },
    UpdateCollisionError: function UpdateCollisionError(options) {
        GhostError.call(this, merge({
            statusCode: 409,
            errorType: 'UpdateCollisionError'
        }, options));
    },
    HostLimitError: function HostLimitError(options) {
        GhostError.call(this, merge({
            errorType: 'HostLimitError',
            hideStack: true,
            statusCode: 403
        }, options));
    },
    HelperWarning: function HelperWarning(options) {
        GhostError.call(this, merge({
            errorType: 'HelperWarning',
            hideStack: true
        }, options));
    }
};

util.inherits(GhostError, errors.IgnitionError);
each(ghostErrors, function (error) {
    util.inherits(error, GhostError);
});

// we need to inherit all general errors from GhostError, otherwise we have to check instanceof IgnitionError
each(errors, function (error) {
    if (error.name === 'IgnitionError' || typeof error === 'object') {
        return;
    }

    util.inherits(error, GhostError);
});

module.exports = merge(ghostErrors, errors);
module.exports.GhostError = GhostError;
