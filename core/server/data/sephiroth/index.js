function Sephiroth(options) {
    options = options || {};

    this.commands = require('./lib/commands');
    this.utils = require('./lib/utils');
    this.database = require('./lib/database');

    if (!options.database) {
        this.utils.throwError({code: this.utils.errors.databaseConfigMissing});
    }

    this.database.connect(options.database);
}

module.exports = Sephiroth;
