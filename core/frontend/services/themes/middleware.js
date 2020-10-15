const _ = require('lodash');
const hbs = require('./engine');
const urlUtils = require('../../../shared/url-utils');
const config = require('../../../shared/config');
const {i18n} = require('../../../server/lib/common');
const errors = require('@tryghost/errors');
const settingsCache = require('../../../server/services/settings/cache');
const activeTheme = require('./active');
const templates = require('./handlebars/template');

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
            message: i18n.t('errors.middleware.themehandler.missingTheme', {theme: settingsCache.get('active_theme')})
        }));
    }

    // CASE: bootstrap theme validation failed, we would like to show the errors on the site [only production]
    if (activeTheme.get().error && config.get('env') === 'production') {
        return next(new errors.InternalServerError({
            // We use the settingsCache here, because the setting will be set,
            // even if the theme itself is not usable because it is invalid or missing.
            message: i18n.t('errors.middleware.themehandler.invalidTheme', {theme: settingsCache.get('active_theme')}),
            errorDetails: activeTheme.get().error.errorDetails
        }));
    }

    // If the active theme has not yet been mounted, mount it into express
    if (!activeTheme.get().mounted) {
        activeTheme.get().mount(req.app);
    }

    next();
}

function updateGlobalTemplateOptions(req, res, next) {
    templates.updateGlobalTemplateOptions();
    next();
}

function updateLocalTemplateData(req, res, next) {
    // Pass 'secure' flag to the view engine
    // so that templates can choose to render https or http 'url', see url utility
    res.locals.secure = req.secure;

    next();
}

function updateLocalTemplateOptions(req, res, next) {
    const localTemplateOptions = hbs.getLocalTemplateOptions(res.locals);
    const siteData = {
        url: urlUtils.urlFor('home', {secure: req.secure, trailingSlash: false}, true)
    };

    const member = req.member ? {
        uuid: req.member.uuid,
        email: req.member.email,
        name: req.member.name,
        firstname: req.member.name && req.member.name.split(' ')[0],
        avatar_image: req.member.avatar_image,
        subscriptions: req.member.stripe.subscriptions,
        paid: req.member.stripe.subscriptions.length !== 0
    } : null;

    hbs.updateLocalTemplateOptions(res.locals, _.merge({}, localTemplateOptions, {
        // @TODO: remove blog if we drop v2 (Ghost 4.0)
        data: {
            member: member,
            site: siteData,
            blog: siteData
        }
    }));

    next();
}

module.exports = [
    ensureActiveTheme,
    updateGlobalTemplateOptions,
    updateLocalTemplateData,
    updateLocalTemplateOptions
];
