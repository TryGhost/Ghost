var _ = require('lodash'),
    util = require('util');

function SephirothError(options) {
    options = options || {};
    var self = this;

    if (_.isString(options)) {
        throw new Error('Please instantiate Errors with the option pattern. e.g. new errors.SephirothError({message: ...})');
    }

    Error.call(this);
    Error.captureStackTrace(this, SephirothError);

    /**
     * defaults
     */
    this.statusCode = 500;
    this.errorType = this.name = 'SephirothError';
    this.id = 0;

    /**
     * option overrides
     */
    this.id = options.id || this.id;
    this.message = options.message || this.message;
    this.code = options.code || this.code;
    this.errorType = this.name = options.errorType || this.errorType;

    // error to inherit from, override!
    if (options.err) {
        Object.getOwnPropertyNames(options.err).forEach(function (property) {
            self[property] = options.err[property] || self[property];
        });
    }
}

// jscs:disable
var errors = {
    MigrationExistsError: function MigrationExistsError(options) {
        SephirothError.call(this, _.merge({
            id: 100,
            errorType: 'MigrationExistsError'
        }, options));
    },
    DatabaseIsNotOkError: function DatabaseIsNotOkError(options) {
        SephirothError.call(this, _.merge({
            id: 200,
            errorType: 'DatabaseIsNotOkError'
        }, options));
    }
};

_.each(errors, function (error) {
    util.inherits(error, SephirothError);
});

module.exports = errors;
module.exports.SephirothError = SephirothError;
