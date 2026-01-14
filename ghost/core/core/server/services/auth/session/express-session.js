const util = require('util');
const session = require('express-session');
const config = require('../../../../shared/config');
const settingsCache = require('../../../../shared/settings-cache');
const models = require('../../../models');
const urlUtils = require('../../../../shared/url-utils');

const SessionStore = require('./session-store');
const sessionStore = new SessionStore(models.Session);

let unoExpressSessionMiddleware;

function getExpressSessionMiddleware() {
    if (!unoExpressSessionMiddleware) {
        unoExpressSessionMiddleware = session({
            store: sessionStore,
            secret: settingsCache.get('admin_session_secret'),
            resave: false,
            saveUninitialized: false,
            name: 'ghost-admin-api-session',
            cookie: {
                maxAge: 6 * 30 * 24 * 60 * 60 * 1000, // 6 months in ms
                httpOnly: true,
                path: urlUtils.getSubdir() + '/ghost',
                sameSite: urlUtils.isSSL(config.get('url')) ? 'none' : 'lax',
                secure: urlUtils.isSSL(config.get('url'))
            }
        });
    }
    return unoExpressSessionMiddleware;
}

module.exports.getSession = async function getSession(req, res) {
    if (req.session) {
        return req.session;
    }
    const expressSessionMiddleware = getExpressSessionMiddleware();
    return new Promise((resolve, reject) => {
        expressSessionMiddleware(req, res, function (err) {
            if (err) {
                return reject(err);
            }
            resolve(req.session);
        });
    });
};

module.exports.deleteAllSessions = util.promisify(sessionStore.clear.bind(sessionStore));
