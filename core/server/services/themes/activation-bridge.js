const debug = require('@tryghost/debug')('themes');
const bridge = require('../../../bridge');

/**
 * These helper methods mean that the bridge is only required in one place
 * And also adds a little debug statement, which is very handy when debugging theme logic
 */
module.exports = {
    activateFromBoot: (themeName, theme, checkedTheme) => {
        debug('Activating theme (method A on boot)', themeName);
        bridge.activateTheme(theme, checkedTheme);
    },
    activateFromAPI: (themeName, theme, checkedTheme) => {
        debug('Activating theme (method B on API "activate")', themeName);
        bridge.activateTheme(theme, checkedTheme);
    },
    activateFromAPIOverride: (themeName, theme, checkedTheme) => {
        debug('Activating theme (method C on API "override")', themeName);
        bridge.activateTheme(theme, checkedTheme);
    }
};
