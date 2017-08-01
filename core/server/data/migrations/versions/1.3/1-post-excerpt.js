'use strict';

const Promise = require('bluebird'),
    logging = require('../../../../logging'),
    commands = require('../../../schema').commands,
    table = 'posts',
    column = 'custom_excerpt',
    message = 'Adding column: ' + table + '.' + column;

module.exports = function addCustomExcerptColumn(options) {
    let transacting = options.transacting;

    return transacting.schema.hasTable(table)
        .then(function (exists) {
            if (!exists) {
                return Promise.reject(new Error('Table does not exist!'));
            }

            return transacting.schema.hasColumn(table, column);
        })
        .then(function (exists) {
            if (exists) {
                logging.warn(message);
            }

            logging.info(message);
            return commands.addColumn(table, column, transacting);
        });
};
