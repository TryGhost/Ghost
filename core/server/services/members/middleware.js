const _ = require('lodash');
const logging = require('@tryghost/logging');
const membersService = require('./service');
const models = require('../../models');
const urlUtils = require('../../../shared/url-utils');
const {formattedMemberResponse} = require('./utils');

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

const getMemberNewsletters = async function (req, res) {
    try {
        const memberUuid = req.query.uuid;

        if (!memberUuid) {
            res.writeHead(400);
            return res.end('Invalid member uuid');
        }

        const memberData = await membersService.api.members.get({
            uuid: memberUuid
        }, {
            withRelated: ['newsletters']
        });

        if (!memberData) {
            res.writeHead(404);
            return res.end('Email address not found.');
        }

        const data = _.pick(memberData.toJSON(), 'uuid', 'email', 'name', 'newsletters', 'status');
        return res.json(data);
    } catch (err) {
        res.writeHead(400);
        res.end('Failed to unsubscribe this email address');
    }
};

const updateMemberNewsletters = async function (req, res) {
    try {
        const memberUuid = req.query.uuid;
        if (!memberUuid) {
            res.writeHead(400);
            return res.end('Invalid member uuid');
        }

        const data = _.pick(req.body, 'newsletters');
        const memberData = await membersService.api.members.get({
            uuid: memberUuid
        });
        if (!memberData) {
            res.writeHead(404);
            return res.end('Email address not found.');
        }

        const options = {
            id: memberData.get('id'),
            withRelated: ['newsletters']
        };

        const updatedMember = await membersService.api.members.update(data, options);
        const updatedMemberData = _.pick(updatedMember.toJSON(), ['uuid', 'email', 'name', 'newsletters', 'status']);
        res.json(updatedMemberData);
    } catch (err) {
        res.writeHead(400);
        res.end('Failed to update newsletters');
    }
};

const updateMemberData = async function (req, res) {
    try {
        const data = _.pick(req.body, 'name', 'subscribed', 'newsletters');
        const member = await membersService.ssr.getMemberDataFromSession(req, res);
        if (member) {
            const options = {
                id: member.id,
                withRelated: ['stripeSubscriptions', 'stripeSubscriptions.customer', 'stripeSubscriptions.stripePrice', 'newsletters']
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

        if (action === 'signup' || action === 'signup-paid' || action === 'subscribe') {
            let customRedirect = '';
            const mostRecentActiveSubscription = subscriptions
                .sort((a, b) => {
                    const aStartDate = new Date(a.start_date);
                    const bStartDate = new Date(b.start_date);
                    return bStartDate.valueOf() - aStartDate.valueOf();
                })
                .find(sub => ['active', 'trialing'].includes(sub.status));
            if (mostRecentActiveSubscription) {
                customRedirect = mostRecentActiveSubscription.tier.welcome_page_url;
            } else {
                const freeTier = await models.Product.findOne({type: 'free'});
                customRedirect = freeTier && freeTier.get('welcome_page_url') || '';
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
    getMemberNewsletters,
    getMemberData,
    updateMemberData,
    updateMemberNewsletters,
    deleteSession
};
