function DatabaseVersion(message, context, help) {
    this.message = message;
    this.stack = new Error().stack;
    this.statusCode = 500;
    this.errorType = this.name;
    this.context = context;
    this.help = help;
}

DatabaseVersion.prototype = Object.create(Error.prototype);
DatabaseVersion.prototype.name = 'DatabaseVersion';

module.exports = DatabaseVersion;
