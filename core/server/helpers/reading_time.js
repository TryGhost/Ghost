// # Reading Time Helper
//
// Usage:  `{{reading_time}}`
// or for translatable themes, with (t) translation helper's subexpressions:
// `{{reading_time seconds=(t "< 1 min read") minute=(t "1 min read") minutes=(t "% min read")}}`
// and in the theme translation file, for example Spanish es.json:
// "< 1 min read": "< 1 min de lectura",
// "1 min read": "1 min de lectura",
// "% min read": "% min de lectura",
//
// Returns estimated reading time for post

var proxy = require('./proxy'),
    _ = require('lodash'),
    schema = require('../data/schema').checks,
    SafeString = proxy.SafeString,
    localUtils = proxy.localUtils;

module.exports = function reading_time(options) {// eslint-disable-line camelcase
    options = options || {};
    options.hash = options.hash || {};

    var html,
        wordsPerMinute = 275,
        wordsPerSecond = wordsPerMinute / 60,
        wordCount,
        imageCount,
        readingTimeSeconds,
        readingTimeMinutes,
        readingTime,
        seconds = _.isString(options.hash.seconds) ? options.hash.seconds : '< 1 min read',
        minute = _.isString(options.hash.minute) ? options.hash.minute : '1 min read',
        minutes = _.isString(options.hash.minutes) ? options.hash.minutes : '% min read';

    // only calculate reading time for posts
    if (!schema.isPost(this)) {
        return null;
    }

    html = this.html;
    imageCount = this.feature_image ? 1 : 0;
    wordCount = localUtils.wordCount(html);
    readingTimeSeconds = wordCount / wordsPerSecond;

    // add 12 seconds to reading time if feature image is present
    readingTimeSeconds = imageCount ? readingTimeSeconds + 12 : readingTimeSeconds;

    readingTimeMinutes = Math.round(readingTimeSeconds / 60);

    if (readingTimeSeconds < 60) {
        readingTime = seconds;
    } else if (readingTimeMinutes === 1) {
        readingTime = minute;
    } else {
        readingTime = minutes.replace('%', readingTimeMinutes);
    }

    return new SafeString(readingTime);
};
