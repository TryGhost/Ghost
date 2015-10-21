// # Conflict error
// Custom error class with status code and type prefilled.

function ConflictError(message) {
    this.message = message;
    this.stack = new Error().stack;
    this.code = 409;
    this.errorType = this.name;
}

ConflictError.prototype = Object.create(Error.prototype);
ConflictError.prototype.name = 'ConflictError';

module.exports = ConflictError;
