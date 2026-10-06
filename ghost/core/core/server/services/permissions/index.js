// canThis(someUser).edit.posts([id]|[[ids]])
// canThis(someUser).edit.post(somePost|somePostId)

const models = require('../../models');
const config = require('../../../shared/config');
const { knex } = require('../../data/db');

const actionsMap = require('./actions-map-cache');
const rolePermissions = require('./role-permissions');
const parity = require('./parity-check');

const init = async function init(options) {
  options = options || {};

  // Read JSON directly: the fixture-manager module imports models and this service.
  const policy = rolePermissions.init(require(config.get('paths').fixtures));
  const actions = actionsMap.init(rolePermissions.all());
  await parity.parityCheck.check(policy, async () => {
    const [roles, permissions, directGrants] = await Promise.all([
      models.Role.findAll({ ...options, withRelated: ['permissions'] }),
      models.Permission.findAll(options),
      knex('permissions_users').count({ count: '*' }).first(),
    ]);
    return {
      roles: roles.toJSON(),
      permissions: permissions.toJSON(),
      directUserGrants: directGrants.count,
    };
  });
  return actions;
};

module.exports = {
  init: init,
  canThis: require('./can-this'),
  // @TODO: Make it so that we don't need to export these
  parseContext: require('./parse-context'),
};
