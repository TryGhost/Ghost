var commands = require('../../schema').commands,
    db       = require('../../db'),

    table    = 'client_trusted_domains';

module.exports = function addClientTrustedDomainsTable(logInfo) {
    return db.knex.schema.hasTable(table).then(function (exists) {
        if (!exists) {
            logInfo('Creating table: ' + table);
            return commands.createTable(table);
        }
    });
};
