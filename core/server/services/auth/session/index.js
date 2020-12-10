const createSessionService = require('@tryghost/session-service');
const createSessionMiddleware = require('./middleware');

const expressSession = require('./express-session');

const models = require('../../../models');
const urlUtils = require('../../../../shared/url-utils');
const url = require('url');

function getOriginOfRequest(req) {
    const origin = req.get('origin');
    const referrer = req.get('referrer') || urlUtils.getAdminUrl() || urlUtils.getSiteUrl();

    if (!origin && !referrer || origin === 'null') {
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

const sessionService = createSessionService({
    getOriginOfRequest,
    getSession: expressSession.getSession,
    findUserById({id}) {
        return models.User.findOne({id});
    }
});

module.exports = createSessionMiddleware({sessionService});
