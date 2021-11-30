const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const activeTheme = require('../active');
const settingsCache = require('../../../../shared/settings-cache');

const messages = {
    missingTheme: 'The currently active theme "{theme}" is missing.'
};

// ### Ensure Active Theme
// Ensure there's a properly set & mounted active theme before attempting to serve a site request
// If there is no active theme, throw an error
// Else, ensure the active theme is mounted
function ensureActiveTheme(req, res, next) {
    // CASE: this means that the theme hasn't been loaded yet i.e. there is no active theme
    if (!activeTheme.get()) {
        // This is the one place we ACTUALLY throw an error for a missing theme as it's a request we cannot serve
        return next(new errors.InternalServerError({
            // We use the settingsCache here, because the setting will be set,
            // even if the theme itself is not usable because it is invalid or missing.
            message: tpl(messages.missingTheme, {theme: settingsCache.get('active_theme')})
        }));
    }

    // If the active theme has not yet been mounted, mount it into express
    if (!activeTheme.get().mounted) {
        activeTheme.get().mount(req.app);
    }

    next();
}

module.exports = ensureActiveTheme;
