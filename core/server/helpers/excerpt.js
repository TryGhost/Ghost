// # Excerpt Helper
// Usage: `{{excerpt}}`, `{{excerpt words="50"}}`, `{{excerpt characters="256"}}`
//
// Attempts to remove all HTML from the string, and then shortens the result according to the provided option.
//
// Defaults to words="50"

var hbs = require('express-hbs'),
    _   = require('lodash'),
    getMetaDataExcerpt = require('../data/meta/excerpt');

function excerpt(options) {
    var truncateOptions = (options || {}).hash || {};

    truncateOptions = _.pick(truncateOptions, ['words', 'characters']);
    _.keys(truncateOptions).map(function (key) {
        truncateOptions[key] = parseInt(truncateOptions[key], 10);
    });

    return new hbs.handlebars.SafeString(
        getMetaDataExcerpt(String(this.html), truncateOptions)
    );
}

module.exports = excerpt;
