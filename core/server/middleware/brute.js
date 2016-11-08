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
            req.authInfo.ip = req.connection.remoteAddress;
            // prevent too many attempts for the same username
            next(req.authInfo.ip + req.body.username + 'login');
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
