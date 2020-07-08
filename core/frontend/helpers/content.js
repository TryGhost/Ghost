// # Content Helper
// Usage: `{{content}}`, `{{content words="20"}}`, `{{content characters="256"}}`
//
// Turns content html into a safestring so that the user doesn't have to
// escape it or tell handlebars to leave it alone with a triple-brace.
//
// Enables tag-safe truncation of content by characters or words.

const {SafeString} = require('../services/proxy');
const downsize = require('downsize');

module.exports = function content(options = {}) {
    const hash = options.hash || {};
    const truncateOptions = {};
    let runTruncate = false;

    for (const key of ['words', 'characters']) {
        if (Object.prototype.hasOwnProperty.call(hash, key)) {
            runTruncate = true;
            truncateOptions[key] = parseInt(hash[key], 10);
        }
    }

    if (this.html === null) {
        this.html = '';
    }

    if (hash.lazy && (hash.lazy === 'true')) {
        this.html = this.html
        .replace(/<img(.*?) srcset="/gi, '<img$1 data-srcset="')
        .replace(/<img(.*?) src="/gi, '<img$1 data-src="')
        .replace(/<img(.*?) class="/gi, '<img$1 loading="lazy" class="lazyload ')
    }

    if (runTruncate) {
        return new SafeString(
            downsize(this.html, truncateOptions)
        );
    }

    return new SafeString(this.html);
};
