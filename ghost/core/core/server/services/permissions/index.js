// canThis(someUser).edit.posts([id]|[[ids]])
// canThis(someUser).edit.post(somePost|somePostId)

const actionsMap = require('./actions-map-cache');
const rolePermissions = require('./role-permissions');

const init = function init() {
  // Build the actions map from the in-memory permission set rather than the
  // database. Still returns a Promise so boot.js and test helpers are untouched.
  return Promise.resolve(actionsMap.init(rolePermissions.all()));
};

module.exports = {
  init: init,
  checkParity: require('./parity-check').checkParity,
  canThis: require('./can-this'),
  // @TODO: Make it so that we don't need to export these
  parseContext: require('./parse-context'),
};
