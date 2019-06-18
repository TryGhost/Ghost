const url = require('url');
const session = require('express-session');
const common = require('../../../lib/common');
const constants = require('../../../lib/constants');
const config = require('../../../config');
const settingsCache = require('../../settings/cache');
const models = require('../../../models');
const SessionStore = require('./store');
const urlUtils = require('../../../lib/url-utils');

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
                path: urlUtils.getSubdir() + '/ghost',
                sameSite: 'lax',
                secure: urlUtils.isSSL(config.get('url'))
            }
        });
    }
    return UNO_SESSIONIONA(req, res, next);
};

const createSession = (req, res, next) => {
    getSession(req, res, function (err) {
        if (err) {
            return next(err);
        }
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

const cookieCsrfProtection = (req) => {
    // If there is no origin on the session object it means this is a *new*
    // session, that hasn't been initialised yet. So we don't need CSRF protection
    if (!req.session.origin) {
        return;
    }

    const origin = getOrigin(req);

    if (req.session.origin !== origin) {
        throw new common.errors.BadRequestError({
            message: common.i18n.t('errors.middleware.auth.mismatchedOrigin', {
                expected: req.session.origin,
                actual: origin
            })
        });
    }
};

const authenticate = (req, res, next) => {
    // CASE: we don't have a cookie header so allow fallthrough to other
    // auth middleware or final "ensure authenticated" check
    if (!req.headers || !req.headers.cookie) {
        req.user = null;
        return next();
    }

    getSession(req, res, function (err) {
        if (err) {
            return next(err);
        }

        try {
            cookieCsrfProtection(req);
        } catch (err) {
            return next(err);
        }

        if (!req.session || !req.session.user_id) {
            req.user = null;
            return next();
        }

        models.User.findOne({id: req.session.user_id})
            .then((user) => {
                req.user = user;
                next();
            })
            .catch(() => {
                req.user = null;
                next();
            });
    });
};

// @TODO: this interface exposes private functions
module.exports = exports = {
    createSession,
    destroySession,
    cookieCsrfProtection,
    authenticate
};
