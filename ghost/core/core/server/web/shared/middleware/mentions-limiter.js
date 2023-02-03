const url = require('url');
const spamPrevention = require('./api/spam-prevention');

module.exports = {
    globalLimits(req, res, next) {
        return spamPrevention.mentionsBlock().getMiddleware({
            ignoreIP: false,
            key(_req, _res, _next) {
                _next(url.parse(_req.url).pathname);
            }
        })(req, res, next);
    }
};
