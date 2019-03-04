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

/**
 * @NOTE:
 *
 * Content API v2 returns a calculated `post.excerpt` field.
 * See https://github.com/TryGhost/Ghost/issues/10062.
 * We have not touched this helper yet, we will revisit later.
 *
 * @TODO: remove or change if we drop v0.1
 */
module.exports = function excerpt(options) {
    var truncateOptions = (options || {}).hash || {},
        excerptText = this.custom_excerpt
            ? String(this.custom_excerpt)
            : this.html
                ? String(this.html)
                : '';

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
