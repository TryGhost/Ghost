var commands = require('../../schema').commands,
    db       = require('../../db'),

    table    = 'client_trusted_domains',
    message  = 'Creating table: ' + table;

module.exports = function addClientTrustedDomainsTable(logger) {
    return db.knex.schema.hasTable(table).then(function (exists) {
        if (!exists) {
            logger.info(message);
            return commands.createTable(table);
        } else {
            logger.warn(message);
        }
    });
};
