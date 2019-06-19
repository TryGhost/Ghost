// # Content Helper
// Usage: `{{content}}`, `{{content words="20"}}`, `{{content characters="256"}}`
//
// Turns content html into a safestring so that the user doesn't have to
// escape it or tell handlebars to leave it alone with a triple-brace.
//
// Enables tag-safe truncation of content by characters or words.

const {SafeString} = require('./proxy');
const downsize = require('downsize');

module.exports = function content(options = {}) {
    const hash = options.hash || {};
    const truncateOptions = {};
    let runTruncate = false;

    for (const key of ['words', 'characters']) {
        if (hash.hasOwnProperty(key)) {
            runTruncate = true;
            truncateOptions[key] = parseInt(hash[key], 10);
        }
    }

    if (this.html === null) {
        this.html = '';
    }

    if (runTruncate) {
        return new SafeString(
            downsize(this.html, truncateOptions)
        );
    }

    return new SafeString(this.html);
};
