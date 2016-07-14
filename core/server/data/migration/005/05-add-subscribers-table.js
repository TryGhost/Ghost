var commands = require('../../schema').commands,
    table    = 'subscribers',
    message  = 'Creating table: ' + table;

module.exports = function addSubscribersTable(options, logger) {
    var transaction = options.transacting;

    return transaction.schema.hasTable(table).then(function (exists) {
        if (!exists) {
            logger.info(message);
            return commands.createTable(table, transaction);
        } else {
            logger.warn(message);
        }
    });
};
