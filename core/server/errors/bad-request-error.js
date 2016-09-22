// # Bad request error
// Custom error class with status code and type prefilled.

function BadRequestError(message) {
    this.message = message;
    this.stack = new Error().stack;
    this.statusCode = 400;
    this.errorType = this.name;
}

BadRequestError.prototype = Object.create(Error.prototype);
BadRequestError.prototype.name = 'BadRequestError';

module.exports = BadRequestError;
