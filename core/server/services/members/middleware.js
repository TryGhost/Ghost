const _ = require('lodash');
const logging = require('@tryghost/logging');
const membersService = require('./service');
const offersService = require('../offers/service');
const urlUtils = require('../../../shared/url-utils');
const ghostVersion = require('@tryghost/version');
const settingsCache = require('../../../shared/settings-cache');
const {formattedMemberResponse} = require('./utils');
const labsService = require('../../../shared/labs');
const config = require('../../../shared/config');

// @TODO: This piece of middleware actually belongs to the frontend, not to the member app
// Need to figure a way to separate these things (e.g. frontend actually talks to members API)
const loadMemberSession = async function (req, res, next) {
    try {
        const member = await membersService.ssr.getMemberDataFromSession(req, res);
        Object.assign(req, {member});
        res.locals.member = req.member;
        next();
    } catch (err) {
        Object.assign(req, {member: null});
        next();
    }
};

const getIdentityToken = async function (req, res) {
    try {
        const token = await membersService.ssr.getIdentityTokenForMemberFromSession(req, res);
        res.writeHead(200);
        res.end(token);
    } catch (err) {
        res.writeHead(204);
        res.end();
    }
};

const deleteSession = async function (req, res) {
    try {
        await membersService.ssr.deleteSession(req, res);
        res.writeHead(204);
        res.end();
    } catch (err) {
        res.writeHead(err.statusCode);
        res.end(err.message);
    }
};

const getMemberData = async function (req, res) {
    try {
        const member = await membersService.ssr.getMemberDataFromSession(req, res);
        if (member) {
            res.json(formattedMemberResponse(member));
        } else {
            res.json(null);
        }
    } catch (err) {
        res.writeHead(204);
        res.end();
    }
};

const getOfferData = async function (req, res) {
    const offerId = req.params.id;
    const offer = await offersService.api.getOffer({id: offerId});
    return res.json({
        offers: [offer]
    });
};

const updateMemberData = async function (req, res) {
    try {
        const data = _.pick(req.body, 'name', 'subscribed');
        const member = await membersService.ssr.getMemberDataFromSession(req, res);
        if (member) {
            const options = {
                id: member.id,
                withRelated: ['stripeSubscriptions', 'stripeSubscriptions.customer', 'stripeSubscriptions.stripePrice']
            };
            const updatedMember = await membersService.api.members.update(data, options);

            res.json(formattedMemberResponse(updatedMember.toJSON()));
        } else {
            res.json(null);
        }
    } catch (err) {
        res.writeHead(err.statusCode);
        res.end(err.message);
    }
};

const getPortalProductPrices = async function () {
    const page = await membersService.api.productRepository.list({
        withRelated: ['monthlyPrice', 'yearlyPrice', 'benefits']
    });

    const products = page.data.map((productModel) => {
        const product = productModel.toJSON();
        const productPrices = [];
        if (product.monthlyPrice) {
            productPrices.push(product.monthlyPrice);
        }
        if (product.yearlyPrice) {
            productPrices.push(product.yearlyPrice);
        }
        return {
            id: product.id,
            name: product.name,
            description: product.description || '',
            monthlyPrice: product.monthlyPrice,
            yearlyPrice: product.yearlyPrice,
            benefits: product.benefits,
            type: product.type,
            prices: productPrices
        };
    });
    const defaultProduct = products.find((product) => {
        return product.type === 'paid';
    });
    const defaultPrices = defaultProduct ? defaultProduct.prices : [];
    let portalProducts = defaultProduct ? [defaultProduct] : [];
    if (labsService.isSet('multipleProducts')) {
        portalProducts = products;
    }

    return {
        prices: defaultPrices,
        products: portalProducts
    };
};

const getMemberSiteData = async function (req, res) {
    const isStripeConfigured = membersService.config.isStripeConnected();
    const domain = urlUtils.urlFor('home', true).match(new RegExp('^https?://([^/:?#]+)(?:[/:?#]|$)', 'i'));
    const firstpromoterId = settingsCache.get('firstpromoter') ? settingsCache.get('firstpromoter_id') : '';
    const blogDomain = domain && domain[1];
    let supportAddress = settingsCache.get('members_support_address') || 'noreply';
    if (!supportAddress.includes('@')) {
        supportAddress = `${supportAddress}@${blogDomain}`;
    }
    const {products = [], prices = []} = await getPortalProductPrices() || {};
    const portalVersion = config.get('portal:version');

    const response = {
        title: settingsCache.get('title'),
        description: settingsCache.get('description'),
        logo: settingsCache.get('logo'),
        icon: settingsCache.get('icon'),
        accent_color: settingsCache.get('accent_color'),
        url: urlUtils.urlFor('home', true),
        version: ghostVersion.safe,
        portal_version: portalVersion,
        free_price_name: settingsCache.get('members_free_price_name'),
        free_price_description: settingsCache.get('members_free_price_description'),
        allow_self_signup: membersService.config.getAllowSelfSignup(),
        members_signup_access: settingsCache.get('members_signup_access'),
        is_stripe_configured: isStripeConfigured,
        portal_button: settingsCache.get('portal_button'),
        portal_name: settingsCache.get('portal_name'),
        portal_plans: settingsCache.get('portal_plans'),
        portal_button_icon: settingsCache.get('portal_button_icon'),
        portal_button_signup_text: settingsCache.get('portal_button_signup_text'),
        portal_button_style: settingsCache.get('portal_button_style'),
        firstpromoter_id: firstpromoterId,
        members_support_address: supportAddress,
        prices,
        products
    };
    if (labsService.isSet('multipleProducts')) {
        response.portal_products = settingsCache.get('portal_products');
    }
    if (config.get('portal_sentry') && !config.get('portal_sentry').disabled) {
        response.portal_sentry = {
            dsn: config.get('portal_sentry').dsn,
            env: config.get('env')
        };
    }
    res.json({site: response});
};

const createSessionFromMagicLink = async function (req, res, next) {
    if (!req.url.includes('token=')) {
        return next();
    }

    // req.query is a plain object, copy it to a URLSearchParams object so we can call toString()
    const searchParams = new URLSearchParams('');
    Object.keys(req.query).forEach((param) => {
        // don't copy the token param
        if (param !== 'token') {
            searchParams.set(param, req.query[param]);
        }
    });

    try {
        const member = await membersService.ssr.exchangeTokenForSession(req, res);
        const subscriptions = member && member.subscriptions || [];

        const action = req.query.action;

        if (action === 'signup') {
            let customRedirect = '';
            if (subscriptions.find(sub => ['active', 'trialing'].includes(sub.status))) {
                customRedirect = settingsCache.get('members_paid_signup_redirect') || '';
            } else {
                customRedirect = settingsCache.get('members_free_signup_redirect') || '';
            }

            if (customRedirect && customRedirect !== '/') {
                const baseUrl = urlUtils.getSiteUrl();
                const ensureEndsWith = (string, endsWith) => (string.endsWith(endsWith) ? string : string + endsWith);
                const removeLeadingSlash = string => string.replace(/^\//, '');

                const redirectUrl = new URL(removeLeadingSlash(ensureEndsWith(customRedirect, '/')), ensureEndsWith(baseUrl, '/'));

                return res.redirect(redirectUrl.href);
            }
        }

        // Do a standard 302 redirect to the homepage, with success=true
        searchParams.set('success', true);
        res.redirect(`${urlUtils.getSubdir()}/?${searchParams.toString()}`);
    } catch (err) {
        logging.warn(err.message);

        // Do a standard 302 redirect to the homepage, with success=false
        searchParams.set('success', false);
        res.redirect(`${urlUtils.getSubdir()}/?${searchParams.toString()}`);
    }
};

// Set req.member & res.locals.member if a cookie is set
module.exports = {
    loadMemberSession,
    createSessionFromMagicLink,
    getIdentityToken,
    getMemberData,
    getOfferData,
    updateMemberData,
    getMemberSiteData,
    deleteSession
};
