var Promise = require('bluebird'),
    config = require('../config'),
    errors = require('../errors'),
    i18n = require('../i18n'),
    validateActiveTheme;

// @TODO replace this with something PROPER - we should probably attempt to read the theme from the
// File system at this point and validate the theme using gscan rather than just checking if it's in a cache object
validateActiveTheme = function validateActiveTheme(themeName) {
    if (!config.get('paths').availableThemes || Object.keys(config.get('paths').availableThemes).length === 0) {
        // We haven't yet loaded all themes, this is probably being called early?
        return Promise.resolve();
    }

    // Else, if we have a list, check if the theme is in it
    if (!config.get('paths').availableThemes.hasOwnProperty(themeName)) {
        return Promise.reject(new errors.ValidationError({message: i18n.t('notices.data.validation.index.themeCannotBeActivated', {themeName: themeName}), context: 'activeTheme'}));
    }
};

module.exports.activeTheme = validateActiveTheme;
