const common = require('../../lib/common');
const labsService = require('../labs');
const membersService = require('./index');

const getIdentityToken = async function (req, res) {
    try {
        const token = await membersService.ssr.getIdentityTokenForMemberFromSession(req, res);
        res.writeHead(200);
        res.end(token);
    } catch (err) {
        common.logging.warn(err.message);
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
        common.logging.warn(err.message);
        res.writeHead(err.statusCode);
        res.end(err.message);
    }
};

const getMemberDataFromSession = async function (req, res, next) {
    if (!labsService.isSet('members')) {
        req.member = null;
        return next();
    }
    try {
        const member = await membersService.ssr.getMemberDataFromSession(req, res);
        Object.assign(req, {member});
        next();
    } catch (err) {
        common.logging.warn(err.message);
        Object.assign(req, {member: null});
        next();
    }
};

const getMemberData = async function (req, res) {
    if (!labsService.isSet('members')) {
        res.json(null);
    }
    try {
        const member = await membersService.ssr.getMemberDataFromSession(req, res);
        if (member) {
            res.json({
                uuid: member.uuid,
                email: member.email,
                name: member.name,
                firstname: member.name && req.member.name.split(' ')[0],
                avatar_image: member.avatar_image,
                subscriptions: member.stripe.subscriptions,
                paid: member.stripe.subscriptions.length !== 0
            });
        } else {
            res.json(null);
        }
    } catch (err) {
        common.logging.warn(err.message);
        res.writeHead(err.statusCode);
        res.end(err.message);
    }
};

const exchangeTokenForSession = async function (req, res, next) {
    if (!labsService.isSet('members')) {
        return next();
    }
    if (!req.url.includes('token=')) {
        return next();
    }
    try {
        const member = await membersService.ssr.exchangeTokenForSession(req, res);
        Object.assign(req, {member});
        next();
    } catch (err) {
        common.logging.warn(err.message);
        return next();
    }
};

const decorateResponse = function (req, res, next) {
    if (!labsService.isSet('members')) {
        return next();
    }
    res.locals.member = req.member;
    next();
};

// @TODO only loads this stuff if members is enabled
// Set req.member & res.locals.member if a cookie is set
module.exports = {
    createSessionFromToken: [
        getMemberDataFromSession,
        exchangeTokenForSession,
        decorateResponse
    ],
    getIdentityToken,
    getMemberData,
    deleteSession,
    stripeWebhooks: (req, res, next) => membersService.api.middleware.handleStripeWebhook(req, res, next)
};
