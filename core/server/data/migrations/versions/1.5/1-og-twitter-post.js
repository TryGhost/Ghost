'use strict';

const Promise = require('bluebird'),
    logging = require('../../../../logging'),
    commands = require('../../../schema').commands,
    table = 'posts',
    column1 = 'og_image',
    column2 = 'og_title',
    column3 = 'og_description',
    column4 = 'twitter_image',
    column5 = 'twitter_title',
    column6 = 'twitter_description',
    message1 = 'Adding column: ' + table + '.' + column1,
    message2 = 'Adding column: ' + table + '.' + column2,
    message3 = 'Adding column: ' + table + '.' + column3,
    message4 = 'Adding column: ' + table + '.' + column4,
    message5 = 'Adding column: ' + table + '.' + column5,
    message6 = 'Adding column: ' + table + '.' + column6;

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
        })
        .then(function () {
            return transacting.schema.hasColumn(table, column3);
        })
        .then(function (exists) {
            if (exists) {
                logging.warn(message3);
                return Promise.resolve();
            }

            logging.info(message3);
            return commands.addColumn(table, column3, transacting);
        })
        .then(function () {
            return transacting.schema.hasColumn(table, column4);
        })
        .then(function (exists) {
            if (exists) {
                logging.warn(message4);
                return Promise.resolve();
            }

            logging.info(message4);
            return commands.addColumn(table, column4, transacting);
        })
        .then(function () {
            return transacting.schema.hasColumn(table, column5);
        })
        .then(function (exists) {
            if (exists) {
                logging.warn(message5);
                return Promise.resolve();
            }

            logging.info(message5);
            return commands.addColumn(table, column5, transacting);
        })
        .then(function () {
            return transacting.schema.hasColumn(table, column6);
        })
        .then(function (exists) {
            if (exists) {
                logging.warn(message6);
                return Promise.resolve();
            }

            logging.info(message6);
            return commands.addColumn(table, column6, transacting);
        });
};
