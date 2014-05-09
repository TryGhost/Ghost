// # Validation Error
// Custom error class with status code and type prefilled.

function ValidationError(message) {
    return new ValidationError(message, null);
}

function ValidationError(message, offendingProperty) {
    this.message = message;
    this.stack = new Error().stack;
    this.code = 422;
    if (offendingProperty) {
        this.property = offendingProperty;
    }
    this.type = this.name;
}

ValidationError.prototype = Object.create(Error.prototype);
ValidationError.prototype.name = "ValidationError";


module.exports = ValidationError;