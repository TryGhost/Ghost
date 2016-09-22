// # Validation Error
// Custom error class with status code and type prefilled.

function ValidationError(message, offendingProperty) {
    this.message = message;
    this.stack = new Error().stack;
    this.statusCode = 422;
    if (offendingProperty) {
        this.property = offendingProperty;
    }
    this.errorType = this.name;
}

ValidationError.prototype = Object.create(Error.prototype);
ValidationError.prototype.name = 'ValidationError';

module.exports = ValidationError;
