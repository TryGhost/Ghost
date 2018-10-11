const url = require('url');
const common = require('../../../lib/common');
const constants = require('../../../lib/constants');
const config = require('../../../config');
const settingsCache = require('../../settings/cache');
const models = require('../../../models');
const session = require('express-session');
const SessionStore = require('./store');
const urlService = require('../../url');

const getOrigin = (req) => {
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
};

let UNO_SESSIONIONA;
const getSession = (req, res, next) => {
    if (!UNO_SESSIONIONA) {
        UNO_SESSIONIONA = session({
            store: new SessionStore(models.Session),
            secret: settingsCache.get('session_secret'),
            resave: false,
            saveUninitialized: false,
            name: 'ghost-admin-api-session',
            cookie: {
                maxAge: constants.SIX_MONTH_MS,
                httpOnly: true,
                path: urlService.utils.getSubdir() + '/ghost',
                sameSite: 'lax',
                secure: urlService.utils.isSSL(config.get('url'))
            }
        });
    }
    return UNO_SESSIONIONA(req, res, next);
};

const createSession = (req, res, next) => {
    getSession(req, res, function () {
        const origin = getOrigin(req);
        if (!origin) {
            return next(new common.errors.BadRequestError({
                message: common.i18n.t('errors.middleware.auth.unknownOrigin')
            }));
        }
        req.session.user_id = req.user.id;
        req.session.origin = origin;
        req.session.user_agent = req.get('user-agent');
        req.session.ip = req.ip;
        res.sendStatus(201);
    });
};

const destroySession = (req, res, next) => {
    req.session.destroy((err) => {
        if (err) {
            return next(new common.errors.InternalServerError({err}));
        }
        return res.sendStatus(204);
    });
};

const getUser = (req, res, next) => {
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

const ensureUser = (req, res, next) => {
    if (req.user && req.user.id) {
        return next();
    }
    next(new common.errors.UnauthorizedError({
        message: common.i18n.t('errors.middleware.auth.accessDenied')
    }));
};

const cookieCsrfProtection = (req, res, next) => {
    // If there is no origin on the session object it means this is a *new*
    // session, that hasn't been initialised yet. So we don't need CSRF protection
    if (!req.session.origin) {
        return next();
    }

    const origin = getOrigin(req);
    if (req.session.origin !== origin) {
        return next(new common.errors.BadRequestError({
            message: common.i18n.t('errors.middleware.auth.mismatchedOrigin', {
                expected: req.session.origin,
                actual: origin
            })
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
