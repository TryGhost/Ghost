const commands = require('../../../schema').commands;
const logging = require('../../../../lib/common/logging');

const tables = ['integrations', 'api_keys'];
const _private = {};

_private.addOrRemoveTable = (type, table, options) => {
    const isAdding = type === 'Adding';
    const operation = isAdding ? commands.createTable : commands.deleteTable;
    const message = `${type} ${table} table`;

    return options.connection.schema.hasTable(table)
        .then((exists) => {
            if ((isAdding && exists || !isAdding && !exists)) {
                logging.warn(message);
                return Promise.resolve();
            }

            logging.info(message);
            return operation(table, options.connection);
        });
};

_private.handle = (migrationOptions) => {
    return (options) => {
        return Promise.each(tables, (table) => {
            return _private.addOrRemoveTable(migrationOptions.type, table, options);
        });
    };
};

module.exports.up = _private.handle({type: 'Adding'});
module.exports.down = _private.handle({type: 'Dropping'});
