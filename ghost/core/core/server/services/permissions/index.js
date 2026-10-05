// canThis(someUser).edit.posts([id]|[[ids]])
// canThis(someUser).edit.post(somePost|somePostId)

const models = require('../../models');
const config = require('../../../shared/config');

const actionsMap = require('./actions-map-cache');
const policy = require('./policy');

const init = async function init(options) {
  options = options || {};

  const [permissionsCollection, rolesCollection] = await Promise.all([
    models.Permission.findAll(options),
    models.Role.findAll({ ...options, withRelated: ['permissions'] }),
  ]);

  policy.init(require(config.get('paths').fixtures), rolesCollection.toJSON());
  return actionsMap.init(permissionsCollection);
};

module.exports = {
  init: init,
  canThis: require('./can-this'),
  // @TODO: Make it so that we don't need to export these
  parseContext: require('./parse-context'),
};
