const debug = require('@tryghost/debug')('themes');

const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const tpl = require('@tryghost/tpl');

const activator = require('./activation-bridge');
const list = require('./list');
const themeLoader = require('./loader');
const validate = require('./validate');

const messages = {
    activeThemeIsMissing: 'The currently active theme "{theme}" is missing.',
    themeCannotBeActivated: '{themeName} cannot be activated because it was not found in the theme directory.'
};

module.exports.loadAndActivate = async (themeName) => {
    debug('loadAndActivate', themeName);
    try {
        // Just read the active theme for now
        const loadedTheme = await themeLoader.loadOneTheme(themeName);
        // Validate
        // @NOTE: this is now the only usage of check, rather than checkSafe...
        const checkedTheme = await validate.check(loadedTheme);

        if (!validate.canActivate(checkedTheme)) {
            logging.error(validate.getThemeValidationError('activeThemeHasFatalErrors', themeName, checkedTheme));
        } else if (checkedTheme.results.error.length) {
            // CASE: inform that the theme has errors, but not fatal (theme still works)
            logging.warn(validate.getThemeValidationError('activeThemeHasErrors', themeName, checkedTheme));
        }

        activator.activateFromBoot(themeName, loadedTheme, checkedTheme);
    } catch (err) {
        if (err instanceof errors.NotFoundError) {
            // CASE: active theme is missing, we don't want to exit because the admin panel will still work
            err.message = tpl(messages.activeThemeIsMissing, {theme: themeName});
        }

        // CASE: theme threw an odd error, we don't want to exit because the admin panel will still work
        // This is the absolute catch-all, at this point, we do not know what went wrong!
        logging.error(err);
    }
};

module.exports.activate = async (themeName) => {
    const loadedTheme = list.get(themeName);

    if (!loadedTheme) {
        throw new errors.ValidationError({
            message: tpl(messages.themeCannotBeActivated, {themeName: themeName}),
            errorDetails: themeName
        });
    }

    // Validate
    const checkedTheme = await validate.checkSafe(themeName, loadedTheme);
    // Activate
    activator.activateFromAPI(themeName, loadedTheme, checkedTheme);
    // Return the checked theme
    return checkedTheme;
};
