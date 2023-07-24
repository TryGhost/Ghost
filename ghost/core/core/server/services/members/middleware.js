const _ = require('lodash');
const logging = require('@tryghost/logging');
const membersService = require('./service');
const emailSuppressionList = require('../email-suppression-list');
const models = require('../../models');
const urlUtils = require('../../../shared/url-utils');
const spamPrevention = require('../../web/shared/middleware/api/spam-prevention');
const {formattedMemberResponse} = require('./utils');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const messages = {
    missingUuid: 'Missing uuid.',
    invalidUuid: 'Invalid uuid.'
};

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

/**
 * Require member authentication, and make it possible to authenticate via uuid.
 * You can chain this after loadMemberSession to make it possible to authenticate via both the uuid and the session.
 */
const authMemberByUuid = async function (req, res, next) {
    try {
        const uuid = req.query.uuid;
        if (!uuid) {
            if (res.locals.member && req.member) {
                // Already authenticated via session
                return next();
            }

            throw new errors.UnauthorizedError({
                messsage: tpl(messages.missingUuid)
            });
        }

        const member = await membersService.api.memberBREADService.read({uuid});
        if (!member) {
            throw new errors.UnauthorizedError({
                message: tpl(messages.invalidUuid)
            });
        }
        Object.assign(req, {member});
        res.locals.member = req.member;
        next();
    } catch (err) {
        next(err);
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
        if (!err.statusCode) {
            logging.error(err);
        }
        res.writeHead(err.statusCode ?? 500, {
            'Content-Type': 'text/plain;charset=UTF-8'
        });
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

const deleteSuppression = async function (req, res) {
    try {
        const member = await membersService.ssr.getMemberDataFromSession(req, res);
        const options = {
            id: member.id
        };
        await emailSuppressionList.removeEmail(member.email);
        await membersService.api.members.update({email_disabled: false}, options);

        res.writeHead(204);
        res.end();
    } catch (err) {
        if (!err.statusCode) {
            logging.error(err);
        }
        res.writeHead(err.statusCode ?? 500, {
            'Content-Type': 'text/plain;charset=UTF-8'
        });
        res.end(err.message);
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

        const data = _.pick(memberData.toJSON(), 'uuid', 'email', 'name', 'newsletters', 'enable_comment_notifications', 'status');
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

        const data = _.pick(req.body, 'newsletters', 'enable_comment_notifications');
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
        const updatedMemberData = _.pick(updatedMember.toJSON(), ['uuid', 'email', 'name', 'newsletters', 'enable_comment_notifications', 'status']);
        res.json(updatedMemberData);
    } catch (err) {
        res.writeHead(400);
        res.end('Failed to update newsletters');
    }
};

const updateMemberData = async function (req, res) {
    try {
        const data = _.pick(req.body, 'name', 'expertise', 'subscribed', 'newsletters', 'enable_comment_notifications');
        const member = await membersService.ssr.getMemberDataFromSession(req, res);
        if (member) {
            const options = {
                id: member.id,
                withRelated: ['stripeSubscriptions', 'stripeSubscriptions.customer', 'stripeSubscriptions.stripePrice', 'newsletters']
            };
            await membersService.api.members.update(data, options);
            const updatedMember = await membersService.ssr.getMemberDataFromSession(req, res);

            res.json(formattedMemberResponse(updatedMember));
        } else {
            res.json(null);
        }
    } catch (err) {
        if (!err.statusCode) {
            logging.error(err);
        }
        res.writeHead(err.statusCode ?? 500, {
            'Content-Type': 'text/plain;charset=UTF-8'
        });
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
        // don't copy the "token" or "r" params
        if (param !== 'token' && param !== 'r') {
            searchParams.set(param, req.query[param]);
        }
    });

    try {
        const member = await membersService.ssr.exchangeTokenForSession(req, res);
        spamPrevention.membersAuth().reset(req.ip, `${member.email}login`);
        // Note: don't reset 'member_login', or that would give an easy way around user enumeration by logging in to a manually created account
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

        if (action === 'signin') {
            const referrer = req.query.r;
            const siteUrl = urlUtils.getSiteUrl();

            if (referrer && referrer.startsWith(siteUrl)) {
                const redirectUrl = new URL(referrer);
                redirectUrl.searchParams.set('success', true);
                redirectUrl.searchParams.set('action', 'signin');
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
    authMemberByUuid,
    createSessionFromMagicLink,
    getIdentityToken,
    getMemberNewsletters,
    getMemberData,
    updateMemberData,
    updateMemberNewsletters,
    deleteSession,
    deleteSuppression
};
