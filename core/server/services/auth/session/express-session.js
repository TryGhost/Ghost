const session = require('express-session');
const constants = require('../../../lib/constants');
const config = require('../../../../shared/config');
const settingsCache = require('../../settings/cache');
const models = require('../../../models');
const urlUtils = require('../../../../shared/url-utils');

const SessionStore = require('./store');

const expressSessionMiddleware = session({
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

exports.getSession = async function getSession(req, res) {
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
};
