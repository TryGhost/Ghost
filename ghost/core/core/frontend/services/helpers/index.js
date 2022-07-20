const registry = require('./registry');

const path = require('path');

// Initialise Ghost's own helpers
// This is a weird place for this to live!
const init = async () => {
    const helperPath = path.join(__dirname, '../../', 'helpers');
    return await registry.registerDir(helperPath);
};

// Oh look! A framework for helpers :D
module.exports = {
    registerAlias: registry.registerAlias,
    registerDir: registry.registerDir,
    registerHelper: registry.registerHelper,
    init
};
