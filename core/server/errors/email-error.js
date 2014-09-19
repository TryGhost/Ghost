// # Email error
// Custom error class with status code and type prefilled.

function EmailError(message) {
    this.message = message;
    this.stack = new Error().stack;
    this.code = 500;
    this.type = this.name;
}

EmailError.prototype = Object.create(Error.prototype);
EmailError.prototype.name = 'EmailError';

module.exports = EmailError;
