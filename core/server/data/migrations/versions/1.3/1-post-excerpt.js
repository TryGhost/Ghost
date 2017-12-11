'use strict';

const Promise = require('bluebird'),
    common = require('../../../../lib/common'),
    commands = require('../../../schema').commands,
    table = 'posts',
    columns = ['custom_excerpt'],
    _private = {};

_private.handle = function handle(options) {
    let type = options.type,
        isAdding = type === 'Adding',
        operation = isAdding ? commands.addColumn : commands.dropColumn;

    return function (options) {
        let connection = options.connection;

        return connection.schema.hasTable(table)
            .then(function (exists) {
                if (!exists) {
                    return Promise.reject(new Error('Table does not exist!'));
                }

                return Promise.each(columns, function (column) {
                    return connection.schema.hasColumn(table, column)
                        .then(function (exists) {
                            if (exists && isAdding || !exists && !isAdding) {
                                common.logging.warn(`${type} column ${table}.${column}`);
                                return Promise.resolve();
                            }

                            common.logging.info(`${type} column ${table}.${column}`);
                            return operation(table, column, connection);
                        });
                });
            });
    };
};

module.exports.up = _private.handle({type: 'Adding'});
module.exports.down = _private.handle({type: 'Dropping'});
