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

// Renders the full content followed by a conversion callout for a gift reader.
// The partial includes `{{{html}}}`, mirroring `content-cta`, so theme overrides
// stay consistent.
function giftCallout(options) {
    options = options || {};
    options.data = options.data || {};

    _.merge(this, {
        accentColor: (options.data.site && options.data.site.accent_color)
    });

    const data = createFrame(options.data);
    return templates.execute('gift-callout', this, {data});
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

    // CASE: a logged-out reader is viewing THIS post via a gift link — append a
    // conversion callout (theme-overridable via partials/gift-callout.hbs).
    // Signed-in members are skipped: they already have account-level entry points
    // (sign-in/upgrade) elsewhere, so the popover would just be noise for them.
    const member = options.data && options.data.member;
    const gift = options.data && options.data.gift;
    if (!member && gift && gift.post_id && gift.post_id === this.id) {
        return giftCallout.apply(self, args);
    }

    return new SafeString(this.html);
};
