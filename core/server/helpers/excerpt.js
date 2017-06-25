// # Excerpt Helper
// Usage:
// `{{excerpt}}`
// `{{excerpt words="50"}}`
// `{{excerpt characters="256"}}`
// `{{excerpt characters="256" round="true"}}`
// `{{excerpt words="50" append="..."}}`
//
// Attempts to remove all HTML from the string, and then shortens the result according to the provided option.
//
// Defaults to words="50"

var proxy = require('./proxy'),
    _ = require('lodash'),
    SafeString = proxy.SafeString,
    getMetaDataExcerpt = proxy.metaData.getMetaDataExcerpt;

module.exports = function excerpt(options) {
    var truncateOptions = (options || {}).hash || {};

    truncateOptions = _.pick(truncateOptions, ['words', 'characters', 'append', 'round']);
    _.keys(truncateOptions).map(function (key) {
        switch (key) {
            case "words":
            case "characters":
                truncateOptions[key] = parseInt(truncateOptions[key], 10);
                break;
            case "round":
                truncateOptions[key] = String(truncateOptions[key]).toLowerCase() === "true";
                break;
        }
    });

    return new SafeString(
        getMetaDataExcerpt(String(this.html), truncateOptions)
    );
};
