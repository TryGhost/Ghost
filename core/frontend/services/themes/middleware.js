const _ = require('lodash');
const hbs = require('./engine');
const urlUtils = require('../../../server/lib/url-utils');
const config = require('../../../server/config');
const common = require('../../../server/lib/common');
const settingsCache = require('../../../server/services/settings/cache');
const labs = require('../../../server/services/labs');
const activeTheme = require('./active');

// ### Ensure Active Theme
// Ensure there's a properly set & mounted active theme before attempting to serve a site request
// If there is no active theme, throw an error
// Else, ensure the active theme is mounted
function ensureActiveTheme(req, res, next) {
    // CASE: this means that the theme hasn't been loaded yet i.e. there is no active theme
    if (!activeTheme.get()) {
        // This is the one place we ACTUALLY throw an error for a missing theme as it's a request we cannot serve
        return next(new common.errors.InternalServerError({
            // We use the settingsCache here, because the setting will be set,
            // even if the theme itself is not usable because it is invalid or missing.
            message: common.i18n.t('errors.middleware.themehandler.missingTheme', {theme: settingsCache.get('active_theme')})
        }));
    }

    // CASE: bootstrap theme validation failed, we would like to show the errors on the site [only production]
    if (activeTheme.get().error && config.get('env') === 'production') {
        return next(new common.errors.InternalServerError({
            // We use the settingsCache here, because the setting will be set,
            // even if the theme itself is not usable because it is invalid or missing.
            message: common.i18n.t('errors.middleware.themehandler.invalidTheme', {theme: settingsCache.get('active_theme')}),
            errorDetails: activeTheme.get().error.errorDetails
        }));
    }

    // If the active theme has not yet been mounted, mount it into express
    if (!activeTheme.get().mounted) {
        activeTheme.get().mount(req.app);
    }

    next();
}

/*
 * @TODO
 * This should be definitely refactored and we need to consider _some_
 * members settings as publicly readable
 */
function haxGetMembersPriceData() {
    const defaultPriceData = {monthly: 0, yearly: 0};
    try {
        const membersSettings = settingsCache.get('members_subscription_settings');
        const stripeProcessor = membersSettings.paymentProcessors.find(
            processor => processor.adapter === 'stripe'
        );

        const priceData = stripeProcessor.config.plans.reduce((prices, plan) => {
            const numberAmount = 0 + plan.amount;
            const dollarAmount = numberAmount ? Math.round(numberAmount / 100) : 0;
            return Object.assign(prices, {
                [plan.name.toLowerCase()]: dollarAmount
            });
        }, {});

        if (Number.isInteger(priceData.monthly) && Number.isInteger(priceData.yearly)) {
            return priceData;
        }

        return defaultPriceData;
    } catch (err) {
        return defaultPriceData;
    }
}

function updateGlobalTemplateOptions(req, res, next) {
    // Static information, same for every request unless the settings change
    // @TODO: bind this once and then update based on events?
    // @TODO: decouple theme layer from settings cache using the Content API
    const siteData = settingsCache.getPublic();
    const labsData = labs.getAll();

    const themeData = {
        posts_per_page: activeTheme.get().config('posts_per_page'),
        image_sizes: activeTheme.get().config('image_sizes')
    };
    const priceData = haxGetMembersPriceData();

    // @TODO: only do this if something changed?
    // @TODO: remove blog if we drop v2 (Ghost 4.0)
    hbs.updateTemplateOptions({
        data: {
            blog: siteData,
            site: siteData,
            labs: labsData,
            config: themeData,
            price: priceData
        }
    });

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
        email: req.member.email,
        name: req.member.name,
        firstname: req.member.name && req.member.name.split(' ')[0],
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
