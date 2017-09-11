var fs = require('fs-extra'),
    _ = require('lodash'),
    url = require('url'),
    debug = require('ghost-ignition').debug('custom-redirects'),
    config = require('../config'),
    errors = require('../errors'),
    logging = require('../logging');

/**
 * you can extend Ghost with a custom redirects file
 * see https://github.com/TryGhost/Ghost/issues/7707
 * file loads synchronously, because we need to register the routes before anything else
 */
module.exports = function redirects(blogApp) {
    debug('redirects loading');
    try {
        var redirects = fs.readFileSync(config.getContentPath('data') + '/redirects.json', 'utf-8');
        redirects = JSON.parse(redirects);

        _.each(redirects, function (redirect) {
            if (!redirect.from || !redirect.to) {
                logging.warn(new errors.IncorrectUsageError({
                    message: 'One of your custom redirects is in a wrong format.',
                    level: 'normal',
                    help: JSON.stringify(redirect),
                    context: 'redirects.json'
                }));

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
                var maxAge = redirect.permanent ? config.get('caching:customRedirects:maxAge') : 0,
                    parsedUrl = url.parse(req.originalUrl);

                res.set({
                    'Cache-Control': 'public, max-age=' + maxAge
                });

                res.redirect(redirect.permanent ? 301 : 302, url.format({
                    pathname: parsedUrl.pathname.replace(new RegExp(redirect.from), redirect.to),
                    search: parsedUrl.search
                }));
            });
        });
    } catch (err) {
        if (err.code !== 'ENOENT') {
            logging.error(new errors.IncorrectUsageError({
                message: 'Your redirects.json is broken.',
                help: 'Check if your JSON is valid.'
            }));
        }
    }

    debug('redirects loaded');
};
