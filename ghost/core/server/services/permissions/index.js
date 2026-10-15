// canThis(someUser).edit.posts([id]|[[ids]])
// canThis(someUser).edit.post(somePost|somePostId)

const actionsMap = require('./actions-map-cache');
const rolePermissions = require('./role-permissions');

/**
 * Builds the actions map from the permissions defined in code. It does no I/O
 * but still returns a promise, which boot awaits alongside other services.
 */
const init = async function init() {
  return actionsMap.init(rolePermissions.all());
};

module.exports = {
  init: init,
  canThis: require('./can-this'),
  // @TODO: Make it so that we don't need to export these
  parseContext: require('./parse-context'),
};
