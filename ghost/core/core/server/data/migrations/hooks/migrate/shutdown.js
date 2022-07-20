const database = require('../../../db');

module.exports = function shutdown(options = {}) {
    /**
     * We have to close Ghost's db connection if knex-migrator was used in the shell.
     * Otherwise the process doesn't exit.
     */
    if (options.executedFromShell === true) {
        return database.knex.destroy();
    }
};
