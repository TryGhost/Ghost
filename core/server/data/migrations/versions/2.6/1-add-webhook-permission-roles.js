const _ = require('lodash');
const utils = require('../../../schema/fixtures/utils');
const permissions = require('../../../../services/permissions');
const logging = require('../../../../lib/common/logging');

const resources = ['webhook'];
const _private = {};

_private.getRelations = function getRelations(resource) {
    return utils.findPermissionRelationsForObject(resource);
};

_private.printResult = function printResult(result, message) {
    if (result.done === result.expected) {
        logging.info(message);
    } else {
        logging.warn(`(${result.done}/${result.expected}) ${message}`);
    }
};

module.exports.config = {
    transaction: true
};

module.exports.up = (options) => {
    const localOptions = _.merge({
        context: {internal: true}
    }, options);

    return Promise.map(resources, (resource) => {
        const relationToAdd = _private.getRelations(resource);

        return utils.addFixturesForRelation(relationToAdd, localOptions)
            .then(result => _private.printResult(result, `Adding permissions_roles fixtures for ${resource}s`))
            .then(() => permissions.init(localOptions));
    });
};
