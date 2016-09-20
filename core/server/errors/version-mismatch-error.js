// # Version mismatch error
// Custom error class with status code and type prefilled.

function VersionMismatchError(message) {
    this.message = message;
    this.stack = new Error().stack;
    this.statusCode = 400;
    this.errorType = this.name;
}

VersionMismatchError.prototype = Object.create(Error.prototype);
VersionMismatchError.prototype.name = 'VersionMismatchError';

module.exports = VersionMismatchError;
