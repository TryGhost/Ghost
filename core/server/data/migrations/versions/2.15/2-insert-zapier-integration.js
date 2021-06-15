const logging = require('@tryghost/logging');
const merge = require('lodash/merge');
const models = require('../../../../models');
const utils = require('../../../schema/fixtures/utils');

const _private = {};

_private.printResult = function printResult(result, message) {
    if (result.done === result.expected) {
        logging.info(message);
    } else {
        logging.warn(`(${result.done}/${result.expected}) ${message}`);
    }
};

_private.addZapierIntegration = (options) => {
    const message = 'Adding "Zapier" integration';
    const fixtureIntegration = utils.findModelFixtureEntry('Integration', {slug: 'zapier'});

    return models.Integration.findOne({slug: fixtureIntegration.slug}, options)
        .then((integration) => {
            if (!integration) {
                return utils.addFixturesForModel({
                    name: 'Integration',
                    entries: [fixtureIntegration]
                }, options).then(result => _private.printResult(result, message));
            }

            logging.warn(message);
        });
};

_private.removeZapierIntegration = (options) => {
    const message = 'Rollback: Removing "Zapier" integration';

    return models.Integration.findOne({slug: 'zapier'}, options)
        .then((integration) => {
            if (!integration) {
                logging.warn(message);
                return;
            }

            return integration.destroy().then(() => {
                logging.info(message);
            });
        });
};

module.exports.config = {
    transaction: true
};

module.exports.up = (options) => {
    const localOptions = merge({
        context: {internal: true},
        migrating: true
    }, options);

    return _private.addZapierIntegration(localOptions);
};

module.exports.down = (options) => {
    const localOptions = merge({
        context: {internal: true},
        migrating: true
    }, options);

    return _private.removeZapierIntegration(localOptions);
};
