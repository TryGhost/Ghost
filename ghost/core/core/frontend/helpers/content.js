// # Content Helper
// Usage: `{{content}}`, `{{content words="20"}}`, `{{content characters="256"}}`
//
// Turns content html into a safestring so that the user doesn't have to
// escape it or tell handlebars to leave it alone with a triple-brace.
//
// Shows default or custom CTA when trying to see content without access
//
// Enables tag-safe truncation of content by characters or words.
//
// Dev flag feature: In case of restricted content access for member-only posts, shows CTA box

const {templates, hbs, SafeString} = require('../services/handlebars');
const downsize = require('downsize');
const _ = require('lodash');
const createFrame = hbs.handlebars.createFrame;

function restrictedCta(options) {
    options = options || {};
    options.data = options.data || {};

    _.merge(this, {
        // @deprecated in Ghost 5.16.1 - not documented & removed from core templates
        accentColor: (options.data.site && options.data.site.accent_color)
    });

    const data = createFrame(options.data);
    return templates.execute('content-cta', this, {data});
}

module.exports = function content(options = {}) {
    let self = this;
    let args = arguments;

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

    if (!_.isUndefined(this.access) && !this.access) {
        return restrictedCta.apply(self, args);
    }

    if (runTruncate) {
        return new SafeString(
            downsize(this.html, truncateOptions)
        );
    }

    return new SafeString(this.html);
};
