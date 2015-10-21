// # ActiveThemeNotFoudError Error
// Custom error class with status code and type prefilled.

function ActiveThemeNotFoundError(message, offendingProperty, fallbackTheme) {
    this.message = message;
    this.stack = new Error().stack;
    this.code = 422;
    if (offendingProperty) {
        this.property = offendingProperty;
    }
    if (fallbackTheme) {
        this.fallbackTheme = fallbackTheme;
    }
    this.errorType = this.name;
}

ActiveThemeNotFoundError.prototype = Object.create(Error.prototype);
ActiveThemeNotFoundError.prototype.name = 'ActiveThemeNotFoundError';

module.exports = ActiveThemeNotFoundError;
