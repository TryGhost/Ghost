const Promise = require('bluebird');
const logging = require('@tryghost/logging');
const commands = require('../../../schema').commands;

const tables = [
    'subscribers'
];

module.exports.config = {
    irreversible: true
};

module.exports.up = (options) => {
    const connection = options.connection;

    return Promise.each(tables, function (table) {
        return connection.schema.hasTable(table)
            .then(function (exists) {
                if (!exists) {
                    logging.warn(`Dropping table: ${table}`);
                    return;
                }

                logging.info(`Dropping table: ${table}`);
                return commands.deleteTable(table, connection);
            });
    });
};

// the schemas for the deleted tables no longer exist so there's nothing for
// `commands.createTable` to draw from for the table structure
module.exports.down = () => {
    return Promise.reject();
};
