const Promise = require('bluebird'),
    common = require('../../../../lib/common'),
    commands = require('../../../schema').commands,
    table = 'posts_authors',
    message1 = 'Adding table: ' + table,
    message2 = 'Dropping table: ' + table;

module.exports.up = function addMultipleAuthorsTable(options) {
    let connection = options.connection;

    return connection.schema.hasTable(table)
        .then(function (exists) {
            if (exists) {
                common.logging.warn(message1);
                return Promise.resolve();
            }

            common.logging.info(message1);
            return commands.createTable(table, connection);
        });
};

module.exports.down = function removeMultipleAuthorsTable(options) {
    let connection = options.connection;

    return connection.schema.hasTable(table)
        .then(function (exists) {
            if (!exists) {
                common.logging.warn(message2);
                return Promise.resolve();
            }

            common.logging.info(message2);
            return commands.deleteTable(table, connection);
        });
};
