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
const {urlUtils} = require('../services/proxy');
const {textColorForBackgroundColor} = require('@tryghost/color-utils');
const downsize = require('downsize-cjs');
const _ = require('lodash');
const createFrame = hbs.handlebars.createFrame;

/**
 * Resolves the per-post CTA overrides from the post's paywall card
 * (`paywall_cta`, attached by the Content API serializer) into the shape the
 * content-cta template renders. Empty fields fall through to the template's
 * built-in defaults.
 */
function getPaywallCustomisation(post) {
    const cardCta = post.paywall_cta || {};

    // A custom button link may be a portal hash (#/portal/...), a relative
    // path (an offer's /code), or a full URL — resolve relative paths against
    // the site so themes can render the href as-is
    let buttonUrl = null;
    if (cardCta.button_url) {
        if (/^(#|https?:\/\/)/.test(cardCta.button_url)) {
            buttonUrl = cardCta.button_url;
        } else {
            buttonUrl = urlUtils.createUrl(cardCta.button_url, true);
        }
    }

    const buttonColor = cardCta.button_color || null;
    const backgroundColor = cardCta.background_color || null;

    return {
        heading: cardCta.heading || null,
        description: cardCta.description || null,
        buttonText: cardCta.button_text || null,
        buttonUrl,
        image: cardCta.image || null,
        imageBottom: Boolean(cardCta.image_bottom),
        imageSmall: Boolean(cardCta.image_small),
        backgroundColor,
        // the stock box is accent-on-white-text; a custom (usually pastel)
        // background needs a readable text colour, derived not stored
        backgroundTextColor: backgroundColor ? textColorForBackgroundColor(backgroundColor).hex() : null,
        buttonColor,
        // a readable label colour for a custom button, derived not stored
        buttonTextColor: buttonColor ? textColorForBackgroundColor(buttonColor).hex() : null
    };
}

function restrictedCta(options) {
    options = options || {};
    options.data = options.data || {};

    _.merge(this, {
        // @deprecated in Ghost 5.16.1 - not documented & removed from core templates
        accentColor: (options.data.site && options.data.site.accent_color),
        paywall: getPaywallCustomisation(this)
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
