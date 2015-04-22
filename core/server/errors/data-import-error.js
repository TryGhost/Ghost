// # Data import error
// Custom error class with status code and type prefilled.

function DataImportError(message, offendingProperty, value) {
    this.message = message;
    this.stack = new Error().stack;
    this.code = 500;
    this.errorType = this.name;
    this.property = offendingProperty || undefined;
    this.value = value || undefined;
}

DataImportError.prototype = Object.create(Error.prototype);
DataImportError.prototype.name = 'DataImportError';

module.exports = DataImportError;
