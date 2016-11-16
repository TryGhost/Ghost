var spamPrevention = require('./api/spam-prevention');

module.exports = {
    globalBlock: spamPrevention.globalBlock.getMiddleware({
        // We want to ignore req.ip and instead use req.connection.remoteAddress
        ignoreIP: true,
        key: function (req, res, next) {
            req.authInfo = req.authInfo || {};
            req.authInfo.ip = req.connection.remoteAddress;
            req.body.connection = req.connection.remoteAddress;

            next(req.authInfo.ip);
        }
    }),
    globalReset: spamPrevention.globalReset.getMiddleware({
        ignoreIP: true,
        key: function (req, res, next) {
            req.authInfo = req.authInfo || {};
            req.authInfo.ip = req.connection.remoteAddress;
            // prevent too many attempts for the same email address but keep separate to login brute force prevention
            next(req.authInfo.ip);
        }
    }),
    userLogin: spamPrevention.userLogin.getMiddleware({
        ignoreIP: true,
        key: function (req, res, next) {
            req.authInfo = req.authInfo || {};
            req.authInfo.ip = req.connection.remoteAddress || req.ip;
            // prevent too many attempts for the same username
            if (req.body.username) {
                return next(req.authInfo.ip + req.body.username + 'login');
            }

            if (req.body.authorizationCode) {
                return next(req.authInfo.ip + req.body.authorizationCode + 'login');
            }

            if (req.body.refresh_token) {
                return next(req.authInfo.ip + req.body.refresh_token + 'login');
            }

            return next();
        }
    }),
    userReset: spamPrevention.userReset.getMiddleware({
        ignoreIP: true,
        key: function (req, res, next) {
            req.authInfo = req.authInfo || {};
            req.authInfo.ip = req.connection.remoteAddress;
            // prevent too many attempts for the same email address but keep separate to login brute force prevention
            next(req.authInfo.ip + req.body.username + 'reset');
        }
    }),
    privateBlog: spamPrevention.privateBlog.getMiddleware({
        ignoreIP: true,
        key: function (req, res, next) {
            req.authInfo = req.authInfo || {};
            req.authInfo.ip = req.connection.remoteAddress;
            // prevent too many attempts for the same email address but keep separate to login brute force prevention
            next(req.authInfo.ip + 'private');
        }
    })
};
