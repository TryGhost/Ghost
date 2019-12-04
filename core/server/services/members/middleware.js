const common = require('../../lib/common');
const constants = require('../../lib/constants');
const shared = require('../../web/shared');
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
    res.locals.member = req.member;
    next();
};

// @TODO only loads this stuff if members is enabled
// Set req.member & res.locals.member if a cookie is set
module.exports = {
    public: [
        shared.middlewares.labs.members,
        shared.middlewares.servePublicFile.createPublicFileMiddleware(
            'public/members.js',
            'application/javascript',
            constants.ONE_HOUR_S
        )
    ],
    createSessionFromToken: [
        getMemberDataFromSession,
        exchangeTokenForSession,
        decorateResponse
    ],
    getIdentityToken: [
        shared.middlewares.labs.members,
        getIdentityToken
    ],
    deleteSession: [
        shared.middlewares.labs.members,
        deleteSession
    ],
    stripeWebhooks: [
        shared.middlewares.labs.members,
        (req, res, next) => membersService.api.middleware.handleStripeWebhook(req, res, next)
    ]
};
