const registry = require('./registry');
const path = require('path');
const config = require('../../../shared/config');
const settingsCache = require('../../../shared/settings-cache');

// This is a weird place for this to live!
const init = () => {
    // Initialize Ghost's own helpers
    const helperPath = path.join(__dirname, '../../', 'helpers');
    registry.registerDir(helperPath);

    // Initialize custom helpers in /content/helpers
    const customHelperPath = config.getContentPath('helpers');
    registry.registerDir(customHelperPath);
    
    // Initialize helpers of current theme (/content/themes/xy/helpers)
    const themeName = settingsCache.get('active_theme');
    if (themeName) {
      const themeHelperPath = path.join(config.getContentPath('themes'), themeName, 'helpers');
      registry.registerDir(themeHelperPath);
    }
};

// Oh look! A framework for helpers :D
module.exports = {
    registerAlias: registry.registerAlias,
    registerDir: registry.registerDir,
    registerHelper: registry.registerHelper,
    init
};
