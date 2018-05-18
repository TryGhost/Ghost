// # Content Helper
// Usage: `{{content}}`, `{{content words="20"}}`, `{{content characters="256"}}`
//
// Turns content html into a safestring so that the user doesn't have to
// escape it or tell handlebars to leave it alone with a triple-brace.
//
// Enables tag-safe truncation of content by characters or words.

var proxy = require('./proxy'),
    _ = require('lodash'),
    downsize = require('downsize'),
    SafeString = proxy.SafeString,
    config = proxy.config,
    responsive = require('../lib/image/responsive');

module.exports = function content(options) {
    var truncateOptions = (options || {}).hash || {};
    truncateOptions = _.pick(truncateOptions, ['words', 'characters']);
    _.keys(truncateOptions).map(function (key) {
        truncateOptions[key] = parseInt(truncateOptions[key], 10);
    });

    var html = this.html
    if (config.get('images').optimize) {
        html = responsive.imgs(this.html);
    }

    if (truncateOptions.hasOwnProperty('words') || truncateOptions.hasOwnProperty('characters')) {
        return new SafeString(
            downsize(html, truncateOptions)
        );
    }

    return new SafeString(html);
};
