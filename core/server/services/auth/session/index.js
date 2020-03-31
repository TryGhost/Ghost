const session = require('express-session');
const constants = require('../../../lib/constants');
const config = require('../../../config');
const settingsCache = require('../../settings/cache');
const models = require('../../../models');
const urlUtils = require('../../../lib/url-utils');
const url = require('url');

const SessionService = require('./service');
const SessionStore = require('./store');

function getOriginOfRequest(req) {
    const origin = req.get('origin');
    const referrer = req.get('referrer');

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

async function getSession(req, res) {
    if (req.session) {
        return req.session;
    }
    return new Promise((resolve, reject) => {
        expressSessionMiddleware(req, res, function (err) {
            if (err) {
                return reject(err);
            }
            resolve(req.session);
        });
    });
}

function findUserById({id}) {
    return models.User.findOne({id});
}

let expressSessionMiddleware;
function initExpressSessionMiddleware() {
    if (!expressSessionMiddleware) {
        expressSessionMiddleware = session({
            store: new SessionStore(models.Session),
            secret: settingsCache.get('session_secret'),
            resave: false,
            saveUninitialized: false,
            name: 'ghost-admin-api-session',
            cookie: {
                maxAge: constants.SIX_MONTH_MS,
                httpOnly: true,
                path: urlUtils.getSubdir() + '/ghost',
                sameSite: 'lax',
                secure: urlUtils.isSSL(config.get('url'))
            }
        });
    }
}

let sessionService;
function initSessionService() {
    if (!sessionService) {
        if (!expressSessionMiddleware) {
            initExpressSessionMiddleware();
        }

        sessionService = SessionService({
            getOriginOfRequest,
            getSession,
            findUserById
        });
    }
}

module.exports = {
    // @TODO: expose files/units and not functions of units
    get createSession() {
        return require('./middleware').createSession;
    },

    get destroySession() {
        return require('./middleware').destroySession;
    },

    get authenticate() {
        return require('./middleware').authenticate;
    },

    get service() {
        if (!sessionService) {
            initSessionService();
        }
        return sessionService;
    }
};
