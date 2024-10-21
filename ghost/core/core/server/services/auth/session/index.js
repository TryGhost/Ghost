const adapterManager = require('../../adapter-manager');
const createSessionService = require('@tryghost/session-service');
const sessionFromToken = require('@tryghost/mw-session-from-token');
const createSessionMiddleware = require('./middleware');
const settingsCache = require('../../../../shared/settings-cache');
const {GhostMailer} = require('../../mail');
const {t} = require('../../i18n');

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

const mailer = new GhostMailer();

const sessionService = createSessionService({
    getOriginOfRequest,
    getSession: expressSession.getSession,
    findUserById({id}) {
        return models.User.findOne({id, status: 'active'});
    },
    getSettingsCache(key) {
        return settingsCache.get(key);
    },
    mailer,
    urlUtils,
    t
});

module.exports = createSessionMiddleware({sessionService});

const ssoAdapter = adapterManager.getAdapter('sso');
// Looks funky but this is a "custom" piece of middleware
module.exports.createSessionFromToken = sessionFromToken({
    callNextWithError: false,
    createSession: sessionService.createSessionForUser,
    findUserByLookup: ssoAdapter.getUserForIdentity.bind(ssoAdapter),
    getLookupFromToken: ssoAdapter.getIdentityFromCredentials.bind(ssoAdapter),
    getTokenFromRequest: ssoAdapter.getRequestCredentials.bind(ssoAdapter)
});

// TODO: We have 51 lines here, should move functions out into a utils module
/* eslint-disable max-lines */

module.exports.sessionService = sessionService;
module.exports.deleteAllSessions = expressSession.deleteAllSessions;
