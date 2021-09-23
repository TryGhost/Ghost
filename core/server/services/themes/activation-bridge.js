const debug = require('@tryghost/debug')('themes');
const bridge = require('../../../bridge');
const labs = require('../../../shared/labs');
const customThemeSettings = require('../custom-theme-settings');

/**
 * These helper methods mean that the bridge is only required in one place
 * And also adds a little debug statement, which is very handy when debugging theme logic
 */
module.exports = {
    activateFromBoot: (themeName, theme, checkedTheme) => {
        debug('Activating theme (method A on boot)', themeName);
        // TODO: probably a better place for this to happen - after successful activation / when reloading site?
        if (labs.isSet('customThemeSettings')) {
            customThemeSettings.activateTheme(checkedTheme);
        }
        bridge.activateTheme(theme, checkedTheme);
    },
    activateFromAPI: (themeName, theme, checkedTheme) => {
        debug('Activating theme (method B on API "activate")', themeName);
        // TODO: probably a better place for this to happen - after successful activation / when reloading site?
        if (labs.isSet('customThemeSettings')) {
            customThemeSettings.activateTheme(checkedTheme);
        }
        bridge.activateTheme(theme, checkedTheme);
    },
    activateFromAPIOverride: (themeName, theme, checkedTheme) => {
        debug('Activating theme (method C on API "override")', themeName);
        // TODO: probably a better place for this to happen - after successful activation / when reloading site?
        if (labs.isSet('customThemeSettings')) {
            customThemeSettings.activateTheme(checkedTheme);
        }
        bridge.activateTheme(theme, checkedTheme);
    }
};
