// # Reading Time Helper
//
// Usage:  `{{reading_time}}`
//
// Returns estimated reading time for post

var proxy = require('./proxy'),
    schema = require('../data/schema').checks,
    SafeString = proxy.SafeString,
    localUtils = proxy.localUtils;

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
    imageCount += localUtils.imageCount(html);
    wordCount = localUtils.wordCount(html);
    readingTimeSeconds = wordCount / wordsPerSecond;

    for (var i = 12; i > 12 - imageCount; i -= 1) {
        // add 12 seconds for the first image, 11 for the second, etc. limiting at 3
        readingTimeSeconds += Math.max(i, 3);
    }

    if (readingTimeSeconds < 60) {
        readingTime = '< 1 min read';
    } else {
        readingTime = `${Math.round(readingTimeSeconds / 60)} min read`;
    }

    return new SafeString(readingTime);
};
