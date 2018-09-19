const {URL} = require('url'),
    common = require('../../../lib/common'),
    config = require('../../../config'),
    settingsCache = require('../../settings/cache'),
    {User} = require('../../../models/user'),
    {Session} = require('../../../models/session'),
    session = require('express-session'),
    SessionStore = require('./store'),
    {BadRequestError, UnauthorizedError, InternalServerError} = require('../../../lib/common/errors');

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
        return next(new UnauthorizedError({
            message: common.i18n.t('errors.middleware.auth.accessDenied')
        }));
    }
    const origin = getOrigin(req);
    if (!origin) {
        return next(new BadRequestError({
            message: common.i18n.t('errors.middleware.auth.unknownOrigin')
        }));
    }
    const {username, password} = req.body;
    User.check({
        email: username,
        password
    }).then((user) => {
        req.session.user_id = user.id;
        req.session.origin = origin;
        req.session.user_agent = req.get('user-agent');
        req.session.ip = req.ip;
        res.sendStatus(201);
    }).catch(() => {
        next(new UnauthorizedError({
            message: common.i18n.t('errors.middleware.auth.accessDenied')
        }));
    });
};

const destroySession = function destroySession(req, res, next) {
    req.session.destroy((err) => {
        if (err) {
            return next(new InternalServerError());
        }
        return res.sendStatus(204);
    });
};

const getUser = function getUser(req, res, next) {
    if (!req.session || !req.session.user_id) {
        req.user = null;
        return next();
    }
    User.findOne({id: req.session.user_id})
        .then((user) => {
            req.user = user;
            next();
        }).catch(() => {
            next(new UnauthorizedError({
                message: common.i18n.t('errors.middleware.auth.accessDenied')
            }));
        });
};

const ensureUser = function ensureUser(req, res, next) {
    if (req.user && req.user.id) {
        return next();
    }
    next(new UnauthorizedError({
        message: common.i18n.t('errors.middleware.auth.accessDenied')
    }));
};

const getSession = session({
    store: new SessionStore(Session),
    secret: settingsCache.get('session-secret'),
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 184 * 24 * 60 * 60 * 1000, // number of days in second half of year
        httpOnly: true,
        path: '/ghost',
        sameSite: 'lax',
        secure: /^https:/.test(config.get('url'))
    }
});

const cookieCsrfProtection = function cookieCsrfProtection(req, res, next) {
    // uninitialized session
    if (!req.session.origin) {
        return next();
    }

    if (req.session.origin !== getOrigin(req)) {
        return next(new BadRequestError({
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
