const config = require('../../config'),
    {User} = require('../../models/user'),
    db = require('../../data/db'),
    session = require('express-session'),
    KnexSessionStore = require('connect-session-knex')(session),
    {BadRequestError, UnauthorizedError, InternalServerError} = require('../../lib/common/errors');

const createSession = function createSession(req, res, next) {
    if (!req.body) {
        return next(new BadRequestError());
    }
    const {username, password} = req.body;
    return User.check({
        email: username,
        password
    }).then(function (user) {
        req.session.user_id = user.id;
        req.session.save(function (err) {
            if (err) {
                return res.send(500);
            }
            res.send(201, {});
        });
    }).catch(function (err) {
        next(new UnauthorizedError(err.message));
    });
};

const destroySession = function destroySession(req, res, next) {
    res.session.destroy(function (err) {
        if (err) {
            return next(new InternalServerError());
        }
        return res.send(204);
    });
};

const getUser = function getUser(req, res, next) {
    if (!req.session || !req.session.user_id) {
        req.user = null;
        return next();
    }
    User.findOne({id: req.session.user_id})
        .then(function (user) {
            req.user = user;
            next();
        }, function () {
            next(new UnauthorizedError('No user found'));
        });
};

const ensureUser = function ensureUser(req, res, next) {
    if (req.user && req.user.id) {
        return next();
    }
    next(new UnauthorizedError('Missing credentials'));
};

const getSession = session({
    store: new KnexSessionStore(db),
    secret: config.get('session-secret'),
    resave: false,
    saveUninitialised: false,
    cookie: {
        maxAge: 184 * 7 * 24 * 60 * 60 * 1000, // number of days in second half of year
        httpOnly: true,
        secure: /^https:/.test(config.get('url'))
    }
});

module.exports.getSession = getSession;
module.exports.createSession = createSession;
module.exports.destroySession = destroySession;
module.exports.getUser = getUser;
module.exports.ensureUser = ensureUser;
