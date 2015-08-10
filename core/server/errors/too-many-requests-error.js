// # Too Many Requests Error
// Custom error class with status code and type prefilled.

function TooManyRequestsError(message) {
    this.message = message;
    this.stack = new Error().stack;
    this.code = 429;
    this.errorType = this.name;
}

TooManyRequestsError.prototype = Object.create(Error.prototype);
TooManyRequestsError.prototype.name = 'TooManyRequestsError';

module.exports = TooManyRequestsError;
