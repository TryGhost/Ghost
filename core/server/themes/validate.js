var Promise = require('bluebird'),
    errors = require('../errors'),
    i18n = require('../i18n'),
    themeList = require('./list'),
    validateActiveTheme;

// @TODO replace this with something PROPER - we should probably attempt to read the theme from the
// File system at this point and validate the theme using gscan rather than just checking if it's in a cache object
validateActiveTheme = function validateActiveTheme(themeName) {
    if (!themeList.getAll() || Object.keys(themeList.getAll()).length === 0) {
        // We haven't yet loaded all themes, this is probably being called early?
        return Promise.resolve();
    }

    // Else, if we have a list, check if the theme is in it
    if (!themeList.get(themeName)) {
        return Promise.reject(new errors.ValidationError({message: i18n.t('notices.data.validation.index.themeCannotBeActivated', {themeName: themeName}), context: 'activeTheme'}));
    }
};

module.exports.activeTheme = validateActiveTheme;
