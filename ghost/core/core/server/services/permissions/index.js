// canThis(someUser).edit.posts([id]|[[ids]])
// canThis(someUser).edit.post(somePost|somePostId)

const models = require('../../models');

const actionsMap = require('./actions-map-cache');

const init = function init(options) {
  options = options || {};

  // Load all the permissions
  return models.Permission.findAll(options).then(function (permissionsCollection) {
    const permissions = permissionsCollection.models.map((perm) => ({
      action_type: perm.get('action_type'),
      object_type: perm.get('object_type'),
    }));
    return actionsMap.init(permissions);
  });
};

module.exports = {
  init: init,
  canThis: require('./can-this'),
  // @TODO: Make it so that we don't need to export these
  parseContext: require('./parse-context'),
};
