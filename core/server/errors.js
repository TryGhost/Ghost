var _ = require('lodash'),
    util = require('util'),
    errors = require('ghost-ignition').errors;

function GhostError(options) {
    options = options || {};
    this.value = options.value;

    errors.IgnitionError.call(this, options);
}

var ghostErrors = {
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
    EmailError: function EmailError(options) {
        GhostError.call(this, _.merge({
            statusCode: 500,
            errorType: 'EmailError'
        }, options));
    },
    ThemeValidationError: function ThemeValidationError(options) {
        GhostError.call(this, _.merge({
            statusCode: 422,
            errorType: 'ThemeValidationError',
            errorDetails: {}
        }, options));
    },
    DisabledFeatureError: function DisabledFeatureError(options) {
        GhostError.call(this, _.merge({
            statusCode: 409,
            errorType: 'DisabledFeatureError'
        }, options));
    },
    UpdateCollisionError: function UpdateCollisionError(options) {
        GhostError.call(this, _.merge({
            statusCode: 409,
            errorType: 'UpdateCollisionError'
        }, options));
    }
};

util.inherits(GhostError, errors.IgnitionError);
_.each(ghostErrors, function (error) {
    util.inherits(error, GhostError);
});

// we need to inherit all general errors from GhostError, otherwise we have to check instanceof IgnitionError
_.each(errors, function (error) {
    if (error.name === 'IgnitionError' || typeof error === 'object') {
        return;
    }

    util.inherits(error, GhostError);
});

module.exports = _.merge(ghostErrors, errors);
module.exports.GhostError = GhostError;
