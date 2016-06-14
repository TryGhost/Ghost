function IncorrectUsage(message, context) {
    this.name = 'IncorrectUsage';
    this.stack = new Error().stack;
    this.statusCode = 400;
    this.errorType = this.name;
    this.message = message;
    this.context = context;
}

IncorrectUsage.prototype = Object.create(Error.prototype);
module.exports = IncorrectUsage;
