const _ = require('lodash'),
    database = require('../../../db');

module.exports = function shutdown(options = {}) {
    if (options.executedFromShell === true) {
        // running knex-migrator migrate --init in the shell does two different migration calls within a single process
        // we have to ensure that we clear the Ghost cache afterwards, otherwise we operate on a destroyed connection
        _.each(require.cache, function (val, key) {
            if (key.match(/core\/server/)) {
                delete require.cache[key];
            }
        });

        /**
         * We have to close Ghost's db connection if knex-migrator was used in the shell.
         * Otherwise the process doesn't exit.
         */
        return database.knex.destroy();
    }
};
