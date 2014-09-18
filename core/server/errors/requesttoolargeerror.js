// # Request Entity Too Large Error
// Custom error class with status code and type prefilled.

function RequestEntityTooLargeError(message) {
    this.message = message;
    this.stack = new Error().stack;
    this.code = 413;
    this.type = this.name;
}

RequestEntityTooLargeError.prototype = Object.create(Error.prototype);
RequestEntityTooLargeError.prototype.name = 'RequestEntityTooLargeError';

module.exports = RequestEntityTooLargeError;
