const models = require('../../../models');
const urlUtils = require('../../../lib/url-utils');
const url = require('url');

const SessionService = require('@tryghost/session-service');
const SessionMiddleware = require('./middleware');
const expressSession = require('./express-session');

function getOriginOfRequest(req) {
    const origin = req.get('origin');
    const referrer = req.get('referrer') || urlUtils.getAdminUrl() || urlUtils.getSiteUrl();

    if (!origin && !referrer) {
        return null;
    }

    if (origin) {
        return origin;
    }

    const {protocol, host} = url.parse(referrer);
    if (protocol && host) {
        return `${protocol}//${host}`;
    }
    return null;
}

function findUserById({id}) {
    return models.User.findOne({id});
}

const sessionService = SessionService({
    getOriginOfRequest,
    getSession: expressSession.getSession,
    findUserById
});

const sessionMiddleware = SessionMiddleware({
    sessionService
});

module.exports = sessionMiddleware;
