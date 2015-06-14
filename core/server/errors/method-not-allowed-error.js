// # Not found error
// Custom error class with status code and type prefilled.

function MethodNotAllowedError(message) {
    this.message = message;
    this.stack = new Error().stack;
    this.code = 405;
    this.errorType = this.name;
}

MethodNotAllowedError.prototype = Object.create(Error.prototype);
MethodNotAllowedError.prototype.name = 'MethodNotAllowedError';

module.exports = MethodNotAllowedError;
