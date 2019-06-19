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

const proxy = require('./proxy');
const schema = require('../../server/data/schema').checks;
const SafeString = proxy.SafeString;
const calculateReadingTime = require('@tryghost/helpers').readingTime;

module.exports = function reading_time(options) {// eslint-disable-line camelcase
    options = options || {};
    options.hash = options.hash || {};

    // only calculate reading time for posts
    if (!schema.isPost(this)) {
        return null;
    }

    let readingTime = calculateReadingTime(this, options.hash);

    return new SafeString(readingTime);
};
