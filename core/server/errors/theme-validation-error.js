// # Theme Validation Error
// Custom error class with status code and type prefilled.

function ThemeValidationError(message, details) {
    this.message = message;
    this.stack = new Error().stack;
    this.statusCode = 422;
    if (details) {
        this.errorDetails = details;
    }

    this.errorType = this.name;
}

ThemeValidationError.prototype = Object.create(Error.prototype);
ThemeValidationError.prototype.name = 'ThemeValidationError';

module.exports = ThemeValidationError;
