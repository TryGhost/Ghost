const {URL} = require('url');
const common = require('../../../lib/common');
const config = require('../../../config');
const settingsCache = require('../../settings/cache');
const models = require('../../../models');
const session = require('express-session');
const SessionStore = require('./store');
const urlService = require('../../url');

const getOrigin = function getOrigin(req) {
    const origin = req.get('origin');
    const referrer = req.get('referrer');

    if (!origin && !referrer) {
        return null;
    }

    if (origin) {
        return origin;
    }

    try {
        return new URL(req.get('referrer')).origin;
    } catch (e) {
        return null;
    }
};

const createSession = function createSession(req, res, next) {
    if (!req.body) {
        return next(new common.errors.UnauthorizedError({
            message: common.i18n.t('errors.middleware.auth.accessDenied')
        }));
    }
    const origin = getOrigin(req);
    if (!origin) {
        return next(new common.errors.BadRequestError({
            message: common.i18n.t('errors.middleware.auth.unknownOrigin')
        }));
    }
    const {username, password} = req.body;
    models.User.check({
        email: username,
        password
    }).then((user) => {
        req.session.user_id = user.id;
        req.session.origin = origin;
        req.session.user_agent = req.get('user-agent');
        req.session.ip = req.ip;
        res.sendStatus(201);
    }).catch((err) => {
        next(new common.errors.UnauthorizedError({
            message: common.i18n.t('errors.middleware.auth.accessDenied'),
            err
        }));
    });
};

const destroySession = function destroySession(req, res, next) {
    req.session.destroy((err) => {
        if (err) {
            return next(new common.errors.InternalServerError({err}));
        }
        return res.sendStatus(204);
    });
};

const getUser = function getUser(req, res, next) {
    if (!req.session || !req.session.user_id) {
        req.user = null;
        return next();
    }
    models.User.findOne({id: req.session.user_id})
        .then((user) => {
            req.user = user;
            next();
        }).catch(() => {
            req.user = null;
            next();
        });
};

const ensureUser = function ensureUser(req, res, next) {
    if (req.user && req.user.id) {
        return next();
    }
    next(new common.errors.UnauthorizedError({
        message: common.i18n.t('errors.middleware.auth.accessDenied')
    }));
};

let UNO_SESSIONIONA;
const getSession = function (req, res, next) {
    if (!UNO_SESSIONIONA) {
        UNO_SESSIONIONA = session({
            store: new SessionStore(models.Session),
            secret: settingsCache.get('session_secret'),
            resave: false,
            saveUninitialized: false,
            cookie: {
                maxAge: 184 * 24 * 60 * 60 * 1000, // number of days in second half of year
                httpOnly: true,
                path: '/ghost',
                sameSite: 'lax',
                secure: urlService.utils.isSSL(config.get('url'))
            }
        });
    }
    return UNO_SESSIONIONA(req, res, next);
};

const cookieCsrfProtection = function cookieCsrfProtection(req, res, next) {
    // If there is no origin on the session object it means this is a *new*
    // session, that hasn't been initialised yet. So we don't need CSRF protection
    if (!req.session.origin) {
        return next();
    }

    if (req.session.origin !== getOrigin(req)) {
        return next(new common.errors.BadRequestError({
            message: common.i18n.t('errors.middleware.auth.mismatchedOrigin')
        }));
    }

    return next();
};

module.exports = exports = {
    getSession,
    cookieCsrfProtection,
    safeGetSession: [getSession, cookieCsrfProtection],
    createSession,
    destroySession,
    getUser,
    ensureUser
};
