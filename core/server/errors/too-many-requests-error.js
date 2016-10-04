// # Too Many Requests Error
// Custom error class with status code and type prefilled.

function TooManyRequestsError(message, context, help) {
    this.message = message;
    this.stack = new Error().stack;
    this.statusCode = 429;
    this.errorType = this.name;
    this.context = context;
    this.help = help;
}

TooManyRequestsError.prototype = Object.create(Error.prototype);
TooManyRequestsError.prototype.name = 'TooManyRequestsError';

module.exports = TooManyRequestsError;
