'use strict';

const Promise = require('bluebird'),
    errors = require('../../../../errors'),
    logging = require('../../../../logging'),
    commands = require('../../../schema').commands,
    table = 'subscribers',
    column = 'source',
    message = 'Adding column: ' + table + '.' + column;

module.exports = function addSourceColumnToSubscriber(options) {
    let transacting = options.transacting;

    return transacting.schema.hasTable(table)
        .then(function (exists) {
            if (!exists) {
                return Promise.reject(new errors.InternalServerError({
                    message: 'Database: Subscribers table does not exist.'
                }));
            }

            return transacting.schema.hasColumn(table, column);
        })
        .then(function (exists) {
            if (exists) {
                return logging.warn(message);
            }

            logging.info(message);
            return commands.addColumn(table, column, transacting);
        });
};
