// # Email error
// Custom error class with status code and type prefilled.

function EmailError(message, context, help) {
    this.message = message;
    this.stack = new Error().stack;
    this.statusCode = 500;
    this.errorType = this.name;
    this.context = context;
    this.help = help;
}

EmailError.prototype = Object.create(Error.prototype);
EmailError.prototype.name = 'EmailError';

module.exports = EmailError;
