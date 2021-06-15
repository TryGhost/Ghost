const logging = require('@tryghost/logging');
const merge = require('lodash/merge');
const models = require('../../../../models');
const utils = require('../../../schema/fixtures/utils');

const resource = 'post';
const _private = {};

_private.printResult = function printResult(result, message) {
    if (result.done === result.expected) {
        logging.info(message);
    } else {
        logging.warn(`(${result.done}/${result.expected}) ${message}`);
    }
};

_private.addSchedulerRole = (options) => {
    const message = 'Adding "Scheduler Integration" role to roles table';
    const apiKeyRole = utils.findModelFixtureEntry('Role', {name: 'Scheduler Integration'});

    return models.Role.findOne({name: apiKeyRole.name}, options)
        .then((role) => {
            if (!role) {
                return utils.addFixturesForModel({
                    name: 'Role',
                    entries: [apiKeyRole]
                }, options).then(result => _private.printResult(result, message));
            }

            logging.warn(message);
        });
};

_private.addPublishPermission = (options) => {
    const modelToAdd = utils.findModelFixtures('Permission', {object_type: resource, action_type: 'publish'});

    return utils.addFixturesForModel(modelToAdd, options)
        .then(result => _private.printResult(result, `Adding "publish" permissions fixtures for ${resource}s`));
};

_private.removeApiKeyPermissionsAndRole = (options) => {
    const message = 'Rollback: Removing "Scheduler Integration" role and permissions';

    const modelToRemove = utils.findModelFixtures('Permission', {object_type: resource, action_type: 'publish'});

    // permission model automatically cleans up permissions_roles on .destroy()
    return utils.removeFixturesForModel(modelToRemove, options)
        .then(result => _private.printResult(result, `Removing "publish" permissions fixtures for ${resource}s`))
        .then(() => models.Role.findOne({name: 'Scheduler Integration'}, options))
        .then((role) => {
            if (!role) {
                logging.warn(message);
                return;
            }

            return role.destroy(options);
        })
        .then(() => {
            logging.info(message);
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

    return _private.addSchedulerRole(localOptions)
        .then(() => _private.addPublishPermission(localOptions));
};

module.exports.down = (options) => {
    const localOptions = merge({
        context: {internal: true},
        migrating: true
    }, options);

    return _private.removeApiKeyPermissionsAndRole(localOptions);
};
