var fs = require('fs-extra'),
    _ = require('lodash'),
    config = require('../config'),
    errors = require('../errors'),
    utils = require('../utils');

/**
 * you can extend Ghost with a custom redirects file
 * see https://github.com/TryGhost/Ghost/issues/7707
 * file loads synchronously, because we need to register the routes before anything else
 */
module.exports = function redirects(blogApp) {
    try {
        var redirects = fs.readFileSync(config.paths.dataPath + '/redirects.json', 'utf-8');
        redirects = JSON.parse(redirects);

        _.each(redirects, function (redirect) {
            if (!redirect.from || !redirect.to) {
                errors.logError(null, 'Your redirects.json file is in a wrong format');
                return;
            }

            /**
             * always delete trailing slashes, doesn't matter if regex or not
             * Example:
             *   - you define /my-blog-post-1/ as from property
             *   - /my-blog-post-1 or /my-blog-post-1/ should work
             */
            if (redirect.from.match(/\/$/)) {
                redirect.from = redirect.from.slice(0, -1);
            }

            if (redirect.from[redirect.from.length - 1] !== '$') {
                redirect.from += '\/?$';
            }

            blogApp.get(new RegExp(redirect.from), function (req, res) {
                var maxAge = redirect.permanent ? utils.ONE_YEAR_S : 0;

                res.set({
                    'Cache-Control': 'public, max-age=' + maxAge
                });

                res.redirect(redirect.permanent ? 301 : 302, req.originalUrl.replace(new RegExp(redirect.from), redirect.to));
            });
        });
    } catch (err) {
        if (err.code !== 'ENOENT') {
            errors.logAndThrowError(err, 'Your redirects.json is broken.', 'Check if your JSON is valid.');
        }
    }
};
