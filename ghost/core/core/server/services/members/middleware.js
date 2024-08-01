const crypto = require('crypto');
const _ = require('lodash');
const logging = require('@tryghost/logging');
const membersService = require('./service');
const emailSuppressionList = require('../email-suppression-list');
const models = require('../../models');
const urlUtils = require('../../../shared/url-utils');
const spamPrevention = require('../../web/shared/middleware/api/spam-prevention');
const {
    formattedMemberResponse,
    formatNewsletterResponse
} = require('./utils');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const onHeaders = require('on-headers');
const tiersService = require('../tiers/service');
const config = require('../../../shared/config');

const messages = {
    missingUuid: 'Missing uuid.',
    invalidUuid: 'Invalid uuid.'
};

const getFreeTier = async function getFreeTier() {
    const response = await tiersService.api.browse();
    const freeTier = response.data.find(tier => tier.type === 'free');
    return freeTier;
};

/**
 * Sets the ghost-access and ghost-access-hmac cookies on the response object
 * @param {Object} member - The member object
 * @param {import('express').Request} req - The member object
 * @param {import('express').Response} res - The express response object to set the cookies on
 * @param {Object} freeTier - The free tier object
 * @returns 
 */
const setAccessCookies = function setAccessCookies(member, req, res, freeTier) {
    if (!member) {
        // If there is no cookie sent with the request, return early
        if (!req.headers.cookie || !req.headers.cookie.includes('ghost-access')) {
            return;
        }
        // If there are cookies sent with the request, set them to null and expire them immediately
        const accessCookie = `ghost-access=null; Max-Age=0; Path=/; HttpOnly; SameSite=Strict;`;
        const hmacCookie = `ghost-access-hmac=null; Max-Age=0; Path=/; HttpOnly; SameSite=Strict;`;
        const existingCookies = res.getHeader('Set-Cookie') || [];
        const cookiesToSet = [accessCookie, hmacCookie].concat(existingCookies);

        res.setHeader('Set-Cookie', cookiesToSet);
        return;
    }
    const hmacSecret = config.get('cacheMembersContent:hmacSecret');
    if (!hmacSecret) {
        return;
    }
    const hmacSecretBuffer = Buffer.from(hmacSecret, 'base64');
    if (hmacSecretBuffer.length === 0) {
        return;
    }
    const activeSubscription = member.subscriptions?.find(sub => sub.status === 'active');

    const cookieTimestamp = Math.floor(Date.now() / 1000); // to mitigate a cookie replay attack
    const memberTier = activeSubscription && activeSubscription.tier.id || freeTier.id;
    const memberTierAndTimestamp = `${memberTier}:${cookieTimestamp}`;
    const memberTierHmac = crypto.createHmac('sha256', hmacSecretBuffer).update(memberTierAndTimestamp).digest('hex');

    const maxAge = 3600;
    const accessCookie = `ghost-access=${memberTierAndTimestamp}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Strict;`;
    const hmacCookie = `ghost-access-hmac=${memberTierHmac}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Strict;`;

    const existingCookies = res.getHeader('Set-Cookie') || [];
    const cookiesToSet = [accessCookie, hmacCookie].concat(existingCookies);
    res.setHeader('Set-Cookie', cookiesToSet);
};

const accessInfoSession = async function accessInfoSession(req, res, next) {
    const freeTier = await getFreeTier();
    onHeaders(res, function () {
        setAccessCookies(req.member, req, res, freeTier);
    });
    next();
};

// @TODO: This piece of middleware actually belongs to the frontend, not to the member app
// Need to figure a way to separate these things (e.g. frontend actually talks to members API)
const loadMemberSession = async function loadMemberSession(req, res, next) {
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
const authMemberByUuid = async function authMemberByUuid(req, res, next) {
    try {
        const uuid = req.query.uuid;
        if (!uuid) {
            if (res.locals.member && req.member) {
                // Already authenticated via session
                return next();
            }

            throw new errors.UnauthorizedError({
                message: tpl(messages.missingUuid)
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

const getIdentityToken = async function getIdentityToken(req, res) {
    try {
        const token = await membersService.ssr.getIdentityTokenForMemberFromSession(req, res);
        res.writeHead(200);
        res.end(token);
    } catch (err) {
        res.writeHead(204);
        res.end();
    }
};

const deleteSession = async function deleteSession(req, res) {
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

const getMemberData = async function getMemberData(req, res) {
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

const deleteSuppression = async function deleteSuppression(req, res) {
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

const getMemberNewsletters = async function getMemberNewsletters(req, res) {
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

        if (data.newsletters) {
            data.newsletters = formatNewsletterResponse(data.newsletters);
        }

        return res.json(data);
    } catch (err) {
        res.writeHead(400);
        res.end('Failed to unsubscribe this email address');
    }
};

const updateMemberNewsletters = async function updateMemberNewsletters(req, res) {
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

        if (updatedMemberData.newsletters) {
            updatedMemberData.newsletters = formatNewsletterResponse(updatedMemberData.newsletters);
        }

        res.json(updatedMemberData);
    } catch (err) {
        res.writeHead(400);
        res.end('Failed to update newsletters');
    }
};

const updateMemberData = async function updateMemberData(req, res) {
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

const createSessionFromMagicLink = async function createSessionFromMagicLink(req, res, next) {
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

        if (config.get('cacheMembersContent:enabled')) {
            // Set the ghost-access cookies to enable tier-based caching
            try {
                const freeTier = await getFreeTier();
                setAccessCookies(member, req, res, freeTier);
            } catch {
                // This is a non-critical operation, so we can safely ignore any errors
            }
        }

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

                // Add query parameters so the frontend can detect that the signup went fine

                const redirectUrl = new URL(removeLeadingSlash(ensureEndsWith(customRedirect, '/')), ensureEndsWith(baseUrl, '/'));

                if (urlUtils.isSiteUrl(redirectUrl)) {
                    // Add only for non-external URLs
                    redirectUrl.searchParams.set('success', 'true');
                    redirectUrl.searchParams.set('action', 'signup');
                }

                return res.redirect(redirectUrl.href);
            }
        }

        // If a custom referrer/redirect was passed, redirect the user to that URL
        const referrer = req.query.r;
        const siteUrl = urlUtils.getSiteUrl();

        if (referrer && referrer.startsWith(siteUrl)) {
            const redirectUrl = new URL(referrer);

            // Copy search params
            searchParams.forEach((value, key) => {
                redirectUrl.searchParams.set(key, value);
            });
            redirectUrl.searchParams.set('success', 'true');

            if (action === 'signin') {
                // Not sure if we can delete this, this is a legacy param
                redirectUrl.searchParams.set('action', 'signin');
            }
            return res.redirect(redirectUrl.href);
        }

        // Do a standard 302 redirect to the homepage, with success=true
        searchParams.set('success', 'true');
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
    accessInfoSession,
    deleteSuppression
};
