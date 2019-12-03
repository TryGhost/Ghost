// # Excerpt Helper
// Usage: `{{excerpt}}`, `{{excerpt words="50"}}`, `{{excerpt characters="256"}}`
//
// Attempts to remove all HTML from the string, and then shortens the result according to the provided option.
//
// Defaults to words="50"

var proxy = require('./proxy'),
    _ = require('lodash'),
    SafeString = proxy.SafeString,
    getMetaDataExcerpt = proxy.metaData.getMetaDataExcerpt;

module.exports = function excerpt(options) {
    let truncateOptions = (options || {}).hash || {};
    let excerptText;

    if (this.custom_excerpt) {
        excerptText = String(this.custom_excerpt);
    } else if (this.html) {
        excerptText = String(this.html);
    } else if (this.excerpt) {
        excerptText = String(this.excerpt);
    } else {
        excerptText = '';
    }

    truncateOptions = _.pick(truncateOptions, ['words', 'characters']);
    _.keys(truncateOptions).map(function (key) {
        truncateOptions[key] = parseInt(truncateOptions[key], 10);
    });

    if (!_.isEmpty(this.custom_excerpt)) {
        truncateOptions.characters = this.custom_excerpt.length;
        if (truncateOptions.words) {
            delete truncateOptions.words;
        }
    }

    return new SafeString(
        getMetaDataExcerpt(excerptText, truncateOptions)
    );
};
