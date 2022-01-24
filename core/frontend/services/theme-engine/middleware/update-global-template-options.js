const hbs = require('../engine');
const urlUtils = require('../../../../shared/url-utils');
const {api} = require('../../proxy');
const settingsCache = require('../../../../shared/settings-cache');
const customThemeSettingsCache = require('../../../../shared/custom-theme-settings-cache');
const labs = require('../../../../shared/labs');
const activeTheme = require('../active');

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

    const defaultProduct = products.find((product) => {
        return product.type === 'paid';
    }) || {};

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
            include: ['monthly_price', 'yearly_price', 'benefits'],
            limit: 'all',
            filter: 'active:true'
        });

        return page.products;
    } catch (err) {
        return [];
    }
}

function getSiteData() {
    let siteData = settingsCache.getPublic();

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
    const siteData = getSiteData();
    const labsData = labs.getAll();

    const themeData = {
        posts_per_page: activeTheme.get().config('posts_per_page'),
        image_sizes: activeTheme.get().config('image_sizes')
    };
    const themeSettingsData = customThemeSettingsCache.getAll();
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
                products,
                custom: themeSettingsData
            }
        });
    }

    next();
}

module.exports = updateGlobalTemplateOptions;
