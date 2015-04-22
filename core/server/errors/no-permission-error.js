// # No Permission Error
// Custom error class with status code and type prefilled.

function NoPermissionError(message) {
    this.message = message;
    this.stack = new Error().stack;
    this.code = 403;
    this.errorType = this.name;
}

NoPermissionError.prototype = Object.create(Error.prototype);
NoPermissionError.prototype.name = 'NoPermissionError';

module.exports = NoPermissionError;
