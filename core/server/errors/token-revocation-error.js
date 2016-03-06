// # Token Revocation ERror
// Custom error class with status code and type prefilled.

function TokenRevocationError(message) {
    this.message = message;
    this.stack = new Error().stack;
    this.statusCode = 503;
    this.errorType = this.name;
}

TokenRevocationError.prototype = Object.create(Error.prototype);
TokenRevocationError.prototype.name = 'TokenRevocationError';

module.exports = TokenRevocationError;
