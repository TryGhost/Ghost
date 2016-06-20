function Maintenance(message) {
    this.message = message;
    this.stack = new Error().stack;
    this.statusCode = 503;
    this.errorType = this.name;
}

Maintenance.prototype = Object.create(Error.prototype);
Maintenance.prototype.name = 'Maintenance';

module.exports = Maintenance;
