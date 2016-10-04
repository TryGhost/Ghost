// # Unauthorized error
// Custom error class with status code and type prefilled.

function UnauthorizedError(message, context, help) {
    this.message = message;
    this.stack = new Error().stack;
    this.statusCode = 401;
    this.errorType = this.name;
    this.context = context;
    this.help = help;
}

UnauthorizedError.prototype = Object.create(Error.prototype);
UnauthorizedError.prototype.name = 'UnauthorizedError';

module.exports = UnauthorizedError;
