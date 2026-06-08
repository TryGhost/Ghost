const registry = require('./registry');
const {registerGhostHelpers} = require('./register-ghost-helpers');

// Oh look! A framework for helpers :D
module.exports = {
    registerAlias: registry.registerAlias,
    registerHelper: registry.registerHelper,
    init: registerGhostHelpers
};
