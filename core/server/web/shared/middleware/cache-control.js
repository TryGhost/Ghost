// # CacheControl Middleware
// Usage: cacheControl(profile), where profile is one of 'public' or 'private'
// After: checkIsPrivate
// Before: routes
// App: Admin|Site|API
//
// Allows each app to declare its own default caching rules

const isString = require('lodash/isString');

const cacheControl = (profile, options = {maxAge: 0}) => {
    const profiles = {
        public: `public, max-age=${options.maxAge}`,
        private: 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
    };

    let output;

    if (isString(profile) && Object.prototype.hasOwnProperty.call(profiles, profile)) {
        output = profiles[profile];
    }

    return function cacheControlHeaders(req, res, next) {
        if (output) {
            res.set({'Cache-Control': output});
        }
        next();
    };
};

module.exports = cacheControl;
