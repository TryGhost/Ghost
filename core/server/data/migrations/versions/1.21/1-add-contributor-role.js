const merge = require('lodash/merge');
const utils = require('../../../schema/fixtures/utils');
const models = require('../../../../models');
const permissions = require('../../../../services/permissions');
const logging = require('@tryghost/logging');
const _private = {};

_private.addRole = function addRole(options) {
    const contributorRole = utils.findModelFixtureEntry('Role', {name: 'Contributor'});
    const message = 'Adding "Contributor" role to roles table';

    return models.Role.findOne({name: contributorRole.name}, options)
        .then((role) => {
            if (!role) {
                logging.info(message);
                return utils.addFixturesForModel({name: 'Role', entries: [contributorRole]}, options);
            }

            logging.warn(message);
            return Promise.resolve();
        });
};

_private.addContributorPermissions = function getPermissions(options) {
    const relations = utils.findRelationFixture('Role', 'Permission');
    const message = 'Adding permissions_roles fixtures for the contributor role';

    return utils.addFixturesForRelation({
        from: relations.from,
        to: relations.to,
        entries: {
            Contributor: relations.entries.Contributor
        }
    }, options).then((result) => {
        if (result.done === result.expected) {
            logging.info(message);
            return;
        }

        logging.warn(`(${result.done}/${result.expected}) ${message}`);
    });
};

module.exports.config = {
    transaction: true
};

module.exports.up = function addContributorRole(options) {
    const localOptions = merge({
        context: {internal: true}
    }, options);

    return _private.addRole(localOptions).then(() => {
        return _private.addContributorPermissions(localOptions);
    }).then(() => {
        return permissions.init(localOptions);
    });
};
