const _ = require('lodash');
const hbs = require('./engine');
const urlUtils = require('../../../shared/url-utils');
const {api} = require('../proxy');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const settingsCache = require('../../../shared/settings-cache');
const labs = require('../../../shared/labs');
const activeTheme = require('./active');
const preview = require('./preview');

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

function calculateLegacyPriceData(products) {
    const defaultPrice = {
        amount: 0,
        currency: 'usd',
        interval: 'year',
        nickname: ''
    };

    function makePriceObject(price) {
        const numberAmount = 0 + price.amount;
        const dollarAmount = numberAmount ? Math.round(numberAmount / 100) : 0;
        return {
            valueOf() {
                return dollarAmount;
            },
            amount: numberAmount,
            currency: price.currency,
            nickname: price.name,
            interval: price.interval
        };
    }

    const defaultProduct = products[0] || {};

    const monthlyPrice = makePriceObject(defaultProduct.monthly_price || defaultPrice);

    const yearlyPrice = makePriceObject(defaultProduct.yearly_price || defaultPrice);

    const priceData = {
        monthly: monthlyPrice,
        yearly: yearlyPrice,
        currency: monthlyPrice ? monthlyPrice.currency : defaultPrice.currency
    };

    return priceData;
}

async function getProductAndPricesData() {
    try {
        const page = await api.canary.productsPublic.browse({
            include: ['monthly_price', 'yearly_price'],
            limit: 'all'
        });

        return page.products;
    } catch (err) {
        return [];
    }
}

function getSiteData(req) {
    let siteData = settingsCache.getPublic();

    // @TODO: it would be nicer if this was proper middleware somehow...
    siteData = preview.handle(req, siteData);

    // theme-only computed property added to @site
    if (settingsCache.get('members_signup_access') === 'none') {
        const escapedUrl = encodeURIComponent(urlUtils.urlFor({relativeUrl: '/rss/'}, true));
        siteData.signup_url = `https://feedly.com/i/subscription/feed/${escapedUrl}`;
    } else {
        siteData.signup_url = '#/portal';
    }

    return siteData;
}

async function updateGlobalTemplateOptions(req, res, next) {
    // Static information, same for every request unless the settings change
    // @TODO: bind this once and then update based on events?
    // @TODO: decouple theme layer from settings cache using the Content API
    const siteData = getSiteData(req);
    const labsData = labs.getAll();

    const themeData = {
        posts_per_page: activeTheme.get().config('posts_per_page'),
        image_sizes: activeTheme.get().config('image_sizes')
    };
    const productData = await getProductAndPricesData();
    const priceData = calculateLegacyPriceData(productData);

    let products = null;
    let product = null;
    if (productData.length === 1) {
        product = productData[0];
    } else {
        products = productData;
    }

    // @TODO: only do this if something changed?
    // @TODO: remove blog in a major where we are happy to break more themes
    {
        hbs.updateTemplateOptions({
            data: {
                blog: siteData,
                site: siteData,
                labs: labsData,
                config: themeData,
                price: priceData,
                product,
                products
            }
        });
    }

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
        subscriptions: req.member.subscriptions && req.member.subscriptions.map((sub) => {
            return Object.assign({}, sub, {
                default_payment_card_last4: sub.default_payment_card_last4 || '****'
            });
        }),
        paid: req.member.status !== 'free'
    } : null;

    hbs.updateLocalTemplateOptions(res.locals, _.merge({}, localTemplateOptions, {
        data: {
            member: member,
            site: siteData,
            // @deprecated: a gscan warning for @blog was added before 3.0 which replaced it with @site
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
