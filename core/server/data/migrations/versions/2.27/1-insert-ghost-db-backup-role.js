const logging = require('@tryghost/logging');
const merge = require('lodash/merge');
const models = require('../../../../models');
const {fixtureManager} = require('../../../schema/fixtures');

const _private = {};

_private.printResult = function printResult(result, message) {
    if (result.done === result.expected) {
        logging.info(message);
    } else {
        logging.warn(`(${result.done}/${result.expected}) ${message}`);
    }
};

_private.addApiKeyRole = (options) => {
    const message = 'Adding "DB Backup Integration" role to roles table';
    const apiKeyRole = fixtureManager.findModelFixtureEntry('Role', {name: 'DB Backup Integration'});

    return models.Role.findOne({name: apiKeyRole.name}, options)
        .then((role) => {
            if (!role) {
                return fixtureManager.addFixturesForModel({
                    name: 'Role',
                    entries: [apiKeyRole]
                }, options).then(result => _private.printResult(result, message));
            }

            logging.warn(message);
        });
};

_private.addApiKeyPermissions = (options) => {
    const message = 'Adding permissions for the "DB Backup Integration" role';
    const relations = fixtureManager.findRelationFixture('Role', 'Permission');

    return fixtureManager.addFixturesForRelation({
        from: relations.from,
        to: relations.to,
        entries: {
            'DB Backup Integration': relations.entries['DB Backup Integration']
        }
    }, options).then(result => _private.printResult(result, message));
};

_private.removeApiKeyPermissionsAndRole = (options) => {
    const message = 'Rollback: Removing "DB Backup Integration" role and permissions';

    return models.Role.findOne({name: 'DB Backup Integration'}, options)
        .then((role) => {
            if (!role) {
                logging.warn(message);
                return;
            }

            return role.destroy(options).then(() => {
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

    return _private.addApiKeyRole(localOptions)
        .then(() => _private.addApiKeyPermissions(localOptions));
};

module.exports.down = (options) => {
    const localOptions = merge({
        context: {internal: true},
        migrating: true
    }, options);

    return _private.removeApiKeyPermissionsAndRole(localOptions);
};
