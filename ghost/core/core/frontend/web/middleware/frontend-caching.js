const config = require('../../../shared/config');
const shared = require('../../../server/web/shared');

const getMiddleware = async () => {
    function setFrontendCacheHeadersMiddleware(req, res, next) {
        if (res.isPrivateBlog || req.member) {
            return shared.middleware.cacheControl('private')(req, res, next);
        }

        if (req.path?.startsWith('/p/')) {
            return shared.middleware.cacheControl('noCache')(req, res, next);
        }

        return shared.middleware.cacheControl('public', {maxAge: config.get('caching:frontend:maxAge')})(req, res, next);
    }

    return setFrontendCacheHeadersMiddleware;
};

module.exports = {
    getMiddleware
};
