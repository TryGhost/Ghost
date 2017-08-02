'use strict';

const Promise = require('bluebird'),
    logging = require('../../../../logging'),
    commands = require('../../../schema').commands,
    table = 'posts',
    column1 = 'codeinjection_head',
    column2 = 'codeinjection_foot',
    message1 = 'Adding column: ' + table + '.' + column1,
    message2 = 'Adding column: ' + table + '.' + column2;

module.exports = function addCodeInjectionPostColumns(options) {
    let transacting = options.transacting;

    return transacting.schema.hasTable(table)
        .then(function (exists) {
            if (!exists) {
                return Promise.reject(new Error('Table does not exist!'));
            }

            return transacting.schema.hasColumn(table, column1);
        })
        .then(function (exists) {
            if (exists) {
                logging.warn(message1);
                return Promise.resolve();
            }

            logging.info(message1);
            return commands.addColumn(table, column1, transacting);
        })
        .then(function () {
            return transacting.schema.hasColumn(table, column2);
        })
        .then(function (exists) {
            if (exists) {
                logging.warn(message2);
                return Promise.resolve();
            }

            logging.info(message2);
            return commands.addColumn(table, column2, transacting);
        });
};
