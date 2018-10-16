// # CacheControl Middleware
// Usage: cacheControl(profile), where profile is one of 'public' or 'private'
// After: checkIsPrivate
// Before: routes
// App: Admin|Site|API
//
// Allows each app to declare its own default caching rules

const isString = require('lodash/isString');
const config = require('../../../config');

const cacheControl = (options) => {
    const profiles = {
        public: 'public, max-age=' + config.get('caching:frontend:maxAge'),
        private: 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
    };

    let output;

    if (isString(options) && profiles.hasOwnProperty(options)) {
        output = profiles[options];
    }

    return function cacheControlHeaders(req, res, next) {
        if (output) {
            if (res.isPrivateBlog) {
                res.set({'Cache-Control': profiles.private});
            } else {
                res.set({'Cache-Control': output});
            }
        }
        next();
    };
};

module.exports = cacheControl;
