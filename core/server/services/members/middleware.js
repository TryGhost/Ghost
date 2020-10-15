const _ = require('lodash');
const logging = require('../../../shared/logging');
const labsService = require('../labs');
const membersService = require('./index');
const urlUtils = require('../../../shared/url-utils');
const ghostVersion = require('../../lib/ghost-version');
const settingsCache = require('../settings/cache');
const {formattedMemberResponse} = require('./utils');

// @TODO: This piece of middleware actually belongs to the frontend, not to the member app
// Need to figure a way to separate these things (e.g. frontend actually talks to members API)
const loadMemberSession = async function (req, res, next) {
    if (!labsService.isSet('members')) {
        req.member = null;
        return next();
    }
    try {
        const member = await membersService.ssr.getMemberDataFromSession(req, res);
        Object.assign(req, {member});
        res.locals.member = req.member;
        next();
    } catch (err) {
        logging.warn(err.message);
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
        logging.warn(err.message);
        res.writeHead(err.statusCode);
        res.end(err.message);
    }
};

const deleteSession = async function (req, res) {
    try {
        await membersService.ssr.deleteSession(req, res);
        res.writeHead(204);
        res.end();
    } catch (err) {
        logging.warn(err.message);
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
        logging.warn(err.message);
        res.writeHead(err.statusCode);
        res.end(err.message);
    }
};

const updateMemberData = async function (req, res) {
    try {
        const data = _.pick(req.body, 'name', 'subscribed');
        const member = await membersService.ssr.getMemberDataFromSession(req, res);
        if (member) {
            const options = {
                id: member.id,
                withRelated: ['stripeSubscriptions', 'stripeSubscriptions.customer']
            };
            const updatedMember = await membersService.api.members.update(data, options);

            res.json(formattedMemberResponse(updatedMember.toJSON()));
        } else {
            res.json(null);
        }
    } catch (err) {
        logging.warn(err.message);
        res.writeHead(err.statusCode);
        res.end(err.message);
    }
};

const getMemberSiteData = async function (req, res) {
    const isStripeConfigured = membersService.config.isStripeConnected();
    const domain = urlUtils.urlFor('home', true).match(new RegExp('^https?://([^/:?#]+)(?:[/:?#]|$)', 'i'));
    const blogDomain = domain && domain[1];
    let supportAddress = settingsCache.get('members_support_address') || 'noreply';
    if (!supportAddress.includes('@')) {
        supportAddress = `${supportAddress}@${blogDomain}`;
    }
    const response = {
        title: settingsCache.get('title'),
        description: settingsCache.get('description'),
        logo: settingsCache.get('logo'),
        icon: settingsCache.get('icon'),
        accent_color: settingsCache.get('accent_color'),
        url: urlUtils.urlFor('home', true),
        version: ghostVersion.safe,
        plans: membersService.config.getPublicPlans(),
        allow_self_signup: membersService.config.getAllowSelfSignup(),
        is_stripe_configured: isStripeConfigured,
        portal_button: settingsCache.get('portal_button'),
        portal_name: settingsCache.get('portal_name'),
        portal_plans: settingsCache.get('portal_plans'),
        portal_button_icon: settingsCache.get('portal_button_icon'),
        portal_button_signup_text: settingsCache.get('portal_button_signup_text'),
        portal_button_style: settingsCache.get('portal_button_style'),
        members_support_address: supportAddress
    };

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

    // We need to include the subdirectory,
    // members is already removed from the path by express because it's a mount path
    let redirectPath = `${urlUtils.getSubdir()}${req.path}`;

    try {
        await membersService.ssr.exchangeTokenForSession(req, res);

        // Do a standard 302 redirect, with success=true
        searchParams.set('success', true);
    } catch (err) {
        logging.warn(err.message);
        searchParams.set('success', false);
    } finally {
        res.redirect(`${redirectPath}?${searchParams.toString()}`);
    }
};

// Set req.member & res.locals.member if a cookie is set
module.exports = {
    loadMemberSession,
    createSessionFromMagicLink,
    getIdentityToken,
    getMemberData,
    updateMemberData,
    getMemberSiteData,
    deleteSession,
    stripeWebhooks: (req, res, next) => membersService.api.middleware.handleStripeWebhook(req, res, next)
};
