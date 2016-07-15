function DatabaseNotPopulated(message) {
    this.message = message;
    this.stack = new Error().stack;
    this.statusCode = 500;
    this.errorType = this.name;
}

DatabaseNotPopulated.prototype = Object.create(Error.prototype);
DatabaseNotPopulated.prototype.name = 'DatabaseNotPopulated';

module.exports = DatabaseNotPopulated;
