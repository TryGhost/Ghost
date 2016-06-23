// # Content Helper
// Usage: `{{content}}`, `{{content words="20"}}`, `{{content characters="256"}}`
//
// Turns content html into a safestring so that the user doesn't have to
// escape it or tell handlebars to leave it alone with a triple-brace.
//
// Enables tag-safe truncation of content by characters or words.

var hbs             = require('express-hbs'),
    _               = require('lodash'),
    downsize        = require('downsize'),
    downzero        = require('../utils/downzero'),
    title_regex = /(\<h[1-3].*>?(.+)(\<\/h[1-3]\>)?)+/gm,
    content;

content = function (options) {
    var truncateOptions = (options || {}).hash || {};
    var addId = truncateOptions.addId || false;
    truncateOptions = _.pick(truncateOptions, ['words', 'characters']);
    _.keys(truncateOptions).map(function (key) {
        truncateOptions[key] = parseInt(truncateOptions[key], 10);
    });

    if (addId) {
        this.html = this.html.replace(title_regex, function (match) {
            var title = match.match(/\>(.+)\</)[1];
            var id = escape(title).replace(/[%\.]/g, '');
            return match.replace(/id=\".*\"/, "id=\"" + id + "\"");
        });
    }

    if (truncateOptions.hasOwnProperty('words') || truncateOptions.hasOwnProperty('characters')) {
        // Legacy function: {{content words="0"}} should return leading tags.
        if (truncateOptions.hasOwnProperty('words') && truncateOptions.words === 0) {
            return new hbs.handlebars.SafeString(
                downzero(this.html)
            );
        }

        return new hbs.handlebars.SafeString(
            downsize(this.html, truncateOptions)
        );
    }

    return new hbs.handlebars.SafeString(this.html);
};

module.exports = content;
