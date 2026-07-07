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
const {settingsCache, urlUtils} = require('../services/proxy');
const downsize = require('downsize-cjs');
const _ = require('lodash');
const createFrame = hbs.handlebars.createFrame;

const PAYWALL_HEADING_SETTINGS = {
    members: 'paywall_heading_members',
    paid: 'paywall_heading_paid',
    tiers: 'paywall_heading_tiers'
};

function getPaywallCustomisation(post) {
    const headingKey = PAYWALL_HEADING_SETTINGS[post.visibility];
    const isPaymentWall = post.visibility === 'paid' || post.visibility === 'tiers';

    // Per-post copy set on the paywall card wins over the site-wide settings,
    // which win over the built-in defaults in the template
    const cardCta = post.paywall_cta || {};

    // Sign-up walls (members visibility) and payment walls have separate
    // site-wide copy so payment language can never leak onto a free wall
    const siteDescription = settingsCache.get(isPaymentWall ? 'paywall_description' : 'paywall_signup_description');
    const siteButtonText = settingsCache.get(isPaymentWall ? 'paywall_button_text' : 'paywall_signup_button_text');

    // Offers are payment CTAs: they apply to paid/tier walls only — a
    // registration (members) wall must never send visitors into a checkout.
    // Precedence: a site offer in campaign mode takes over every payment
    // wall; otherwise the post's own offer wins over the steady-state site
    // offer. Both arrive pre-resolved (and archival-checked) from the API.
    let offerUrl = null;
    let offerHint = null;
    if (isPaymentWall) {
        const siteOffer = post.paywall_site_offer;
        if (siteOffer?.campaign) {
            offerUrl = urlUtils.createUrl(siteOffer.offer_url, true);
            offerHint = siteOffer.offer_hint;
        } else if (cardCta.offer_url) {
            offerUrl = urlUtils.createUrl(cardCta.offer_url, true);
            offerHint = cardCta.offer_hint;
        } else if (siteOffer?.offer_url) {
            offerUrl = urlUtils.createUrl(siteOffer.offer_url, true);
            offerHint = siteOffer.offer_hint;
        }
    }

    return {
        heading: cardCta.heading || (headingKey ? settingsCache.get(headingKey) : null),
        description: cardCta.description || siteDescription,
        buttonText: cardCta.button_text || siteButtonText,
        offerUrl,
        offerHint
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
