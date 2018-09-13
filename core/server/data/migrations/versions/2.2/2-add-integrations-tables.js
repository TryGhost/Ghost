const commands = require('../../../schema').commands;
const logging = require('../../../../lib/common/logging');
const merge = require('lodash/merge');
const models = require('../../../../models');
const utils = require('../../../schema/fixtures/utils');
const _private = {};

_private.createTable = function createTable(table, message, options) {
    return options.connection.schema.hasTable(table)
        .then((exists) => {
            if (exists) {
                logging.warn(message);
                return Promise.resolve();
            }

            logging.info(message);
            return commands.createTable(table, options.connection);
        });
};

_private.addIntegrationsTable = function addIntegrationsTable(options) {
    let table = 'integrations';
    let message = 'Adding "Integrations" table';

    return _private.createTable(table, message, options);
};

_private.addApiKeysTable = function addApiKeysTable(options) {
    let table = 'api_keys';
    let message = 'Adding "API Keys" table';

    return _private.createTable(table, message, options);
};

_private.addApiKeyRole = function addApiKeyRole(options) {
    let message = 'Adding "Admin API Client" role to roles table';
    let apiKeyRole = utils.findModelFixtureEntry('Role', {name: 'Admin API Client'});

    return models.Role.findOne({name: apiKeyRole.name}, options)
        .then((role) => {
            if (!role) {
                logging.info(message);
                return utils.addFixturesForModel({
                    name: 'Role',
                    entries: [apiKeyRole]
                }, options);
            }

            logging.warn(message);
        });
};

_private.addApiKeyPermissions = function addApiKeyPermissions(options) {
    let message = 'Adding permissions_roles fixtures for the admin_api_key role';
    let relations = utils.findRelationFixture('Role', 'Permission');

    return utils.addFixturesForRelation({
        from: relations.from,
        to: relations.to,
        entries: {
            'Admin API Client': relations.entries['Admin API Client']
        }
    }, options).then((result) => {
        if (result.done === result.expected) {
            logging.info(message);
        }

        logging.warn(`(${result.done}/${result.expected}) ${message}`);
    });
};

module.exports.up = function setupIntegrations(options) {
    let localOptions = merge({
        context: {internal: true}
    }, options);

    // TODO: does this rule need adjusting in our eslint config?
    /* eslint-disable arrow-body-style */
    return _private.addIntegrationsTable(localOptions)
        .then(() => _private.addApiKeysTable(localOptions))
        .then(() => _private.addApiKeyRole(localOptions))
        .then(() => _private.addApiKeyPermissions(localOptions));
    /* eslint-enable arrow-body-style */
};
