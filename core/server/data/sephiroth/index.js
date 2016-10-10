function Sephiroth(options) {
    options = options || {};

    this.commands = require('./lib/commands');
    this.utils = require('./lib/utils');
    this.database = require('./lib/database');

    this.database.connect(options.database);
}

module.exports = Sephiroth;
