// # Bad request error
// Custom error class with status code and type prefilled.

function BadRequestError(message) {
    this.message = message;
    this.stack = new Error().stack;
    this.code = 400;
    this.type = this.name;
}

BadRequestError.prototype = Object.create(Error.prototype);
BadRequestError.prototype.name = 'BadRequestError';

module.exports = BadRequestError;
