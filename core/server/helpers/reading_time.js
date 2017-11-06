// # Reading Time Helper
//
// Usage:  `{{reading_time}}`
//
// Returns estimated reading time for post

var proxy = require('./proxy'),
    schema = require('../data/schema').checks,
    SafeString = proxy.SafeString,
    wordCountUtil = require('../utils/word-count');

module.exports = function reading_time() {// eslint-disable-line camelcase
    var html,
        wordsPerMinute = 275,
        wordsPerSecond = wordsPerMinute / 60,
        wordCount,
        imageCount,
        readingTimeSeconds,
        readingTime;

    // only calculate reading time for posts
    if (!schema.isPost(this)) {
        return null;
    }

    html = this.html;
    imageCount = this.feature_image ? 1 : 0;
    wordCount = wordCountUtil(html);
    readingTimeSeconds = wordCount / wordsPerSecond;

    // add 12 seconds to reading time if feature image is present
    readingTimeSeconds = imageCount ? readingTimeSeconds + 12 : readingTimeSeconds;

    if (readingTimeSeconds < 60) {
        readingTime = '< 1 min read';
    } else {
        readingTime = `${Math.round(readingTimeSeconds / 60)} min read`;
    }

    return new SafeString(readingTime);
};
