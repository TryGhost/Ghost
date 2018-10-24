const logging = require('../../../../lib/common/logging');
const models = require('../../../../models');
const utils = require('../../../schema/fixtures/utils');

const printResult = (result, message) => {
    if (result.done === result.expected) {
        logging.info(message);
    } else {
        logging.warn(`(${result.done}/${result.expected}) ${message}`);
    }
};

const addOwnerPermissions = (options) => {
    const message = 'Adding permissions for the "Owner" role';
    const relations = utils.findRelationFixture('Role', 'Permission');

    return utils.addFixturesForRelation({
        from: relations.from,
        to: relations.to,
        entries: {
            Owner: relations.entries.Owner
        }
    }, options).then(result => printResult(result, message));
};

const removeOwnerPermissions = (options) => {
    const message = 'Rollback: Removing "Owner" roles permissions';

    return models.Role.findOne({name: 'Owner'}, options)
        .then((role) => {
            if (!role) {
                logging.warn(message);
                return;
            }

            return role.edit({permissions: []}, {withRelated: ['permissions']}).then(() => {
                logging.info(message);
            });
        });
};

module.exports.config = {
    transaction: true
};

module.exports.up = (options) => {
    const localOptions = Object.assign({
        context: {internal: true},
        migrating: true
    }, options);

    return addOwnerPermissions(localOptions);
};

module.exports.down = (options) => {
    const localOptions = Object.assign({
        context: {internal: true},
        migrating: true
    }, options);

    return removeOwnerPermissions(localOptions);
};
