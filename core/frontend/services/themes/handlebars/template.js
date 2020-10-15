// ## Template utils
const templates = {};
const _ = require('lodash');
const errors = require('@tryghost/errors');
const hbs = require('../engine');
const {i18n, events} = require('../../../../server/lib/common');
const settingsCache = require('../../../../server/services/settings/cache');
const labs = require('../../../../server/services/labs');
const stats = require('../../../../server/services/stats');
const activeTheme = require('../active');

// Execute a template helper
// All template helpers are register as partial view.
templates.execute = function execute(name, context, data) {
    const partial = hbs.handlebars.partials[name];

    if (partial === undefined) {
        throw new errors.IncorrectUsageError({
            message: i18n.t('warnings.helpers.template.templateNotFound', {name: name})
        });
    }

    // If the partial view is not compiled, it compiles and saves in handlebars
    if (typeof partial === 'string') {
        hbs.registerPartial(partial);
    }

    return new hbs.SafeString(partial(context, data));
};

/*
 * @TODO
 * This should be definitely refactored and we need to consider _some_
 * members settings as publicly readable
 */
function haxGetMembersPriceData() {
    const CURRENCY_SYMBOLS = {
        USD: '$',
        AUD: '$',
        CAD: '$',
        GBP: '£',
        EUR: '€',
        INR: '₹'
    };
    const defaultPriceData = {
        monthly: 0,
        yearly: 0
    };

    try {
        const stripePlans = settingsCache.get('stripe_plans');

        const priceData = stripePlans.reduce((prices, plan) => {
            const numberAmount = 0 + plan.amount;
            const dollarAmount = numberAmount ? Math.round(numberAmount / 100) : 0;
            return Object.assign(prices, {
                [plan.name.toLowerCase()]: dollarAmount
            });
        }, {});

        priceData.currency = stripePlans[0].currency;
        priceData.currency_symbol = CURRENCY_SYMBOLS[priceData.currency.toUpperCase()];

        if (Number.isInteger(priceData.monthly) && Number.isInteger(priceData.yearly)) {
            return priceData;
        }

        return defaultPriceData;
    } catch (err) {
        return defaultPriceData;
    }
}

templates.updateGlobalTemplateOptions = function () {
    // Static information, same for every request unless the settings change
    // @TODO: bind labs and siteData once and then update based on events.
    // @TODO: decouple theme layer from settings cache using the Content API
    const siteData = settingsCache.getPublic();
    const labsData = labs.getAll();
    const statsData = stats.getAll();

    const themeData = {
        posts_per_page: activeTheme.get().config('posts_per_page'),
        image_sizes: activeTheme.get().config('image_sizes')
    };
    const priceData = haxGetMembersPriceData();

    // @TODO: remove blog if we drop v2 (Ghost 4.0)
    hbs.updateTemplateOptions({
        data: {
            blog: siteData,
            site: siteData,
            labs: labsData,
            stats: statsData,
            config: themeData,
            price: priceData
        }
    });
};

events.on('updateGlobalTemplateOptions', function () {
    templates.updateGlobalTemplateOptions();
});

templates.asset = _.template('<%= source %>?v=<%= version %>');
templates.link = _.template('<a href="<%= url %>"><%= text %></a>');
templates.script = _.template('<script src="<%= source %>?v=<%= version %>"></script>');
templates.input = _.template('<input class="<%= className %>" type="<%= type %>" name="<%= name %>" <%= extras %> />');

module.exports = templates;
