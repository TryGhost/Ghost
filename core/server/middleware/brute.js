var url = require('url'),
    spamPrevention = require('./api/spam-prevention');

/**
 * We set ignoreIP to false, because we tell brute-knex to use `req.ip`.
 * We can use `req.ip`, because express trust proxy option is enabled.
 */
module.exports = {
    /**
     * block per route per ip
     */
    globalBlock: function (req, res, next) {
        return spamPrevention.globalBlock().getMiddleware({
            ignoreIP: false,
            key: function (req, res, next) {
                next(url.parse(req.url).pathname);
            }
        })(req, res, next);
    },
    /**
     * block per route per ip
     */
    globalReset: function (req, res, next) {
        return spamPrevention.globalReset().getMiddleware({
            ignoreIP: false,
            key: function (req, res, next) {
                next(url.parse(req.url).pathname);
            }
        })(req, res, next);
    },
    /**
     * block per user
     * username === email!
     */
    userLogin: function (req, res, next) {
        return spamPrevention.userLogin().getMiddleware({
            ignoreIP: false,
            key: function (req, res, next) {
                if (req.body.username) {
                    return next(req.body.username + 'login');
                }

                if (req.body.authorizationCode) {
                    return next(req.body.authorizationCode + 'login');
                }

                if (req.body.refresh_token) {
                    return next(req.body.refresh_token + 'login');
                }

                return next();
            }
        })(req, res, next);
    },
    /**
     * block per user
     */
    userReset: function (req, res, next) {
        return spamPrevention.userReset().getMiddleware({
            ignoreIP: false,
            key: function (req, res, next) {
                next(req.body.username + 'reset');
            }
        })(req, res, next);
    },
    /**
     * block per ip
     */
    privateBlog: function (req, res, next) {
        return spamPrevention.privateBlog().getMiddleware({
            ignoreIP: false,
            key: function (req, res, next) {
                next('privateblog');
            }
        })(req, res, next);
    }
};
