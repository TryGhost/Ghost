const htmlToPlaintext = require('@tryghost/html-to-plaintext');
const localUtils = require('../../../index');

const TRANSISTOR_PLACEHOLDER = '<figure class="kg-card kg-transistor-card"><div class="kg-transistor-placeholder"><div class="kg-transistor-icon"><svg viewBox="5 0.5 144 144" xmlns="http://www.w3.org/2000/svg"><g fill="currentColor"><path d="M77 120.3c-2.6 0-4.8-2.1-4.8-4.8V29.4c0-2.6 2.1-4.8 4.8-4.8s4.8 2.1 4.8 4.8v86.2c0 2.6-2.2 4.7-4.8 4.7z"/><path d="M57 77.3H34c-2.6 0-4.8-2.1-4.8-4.8 0-2.6 2.1-4.8 4.8-4.8h23c2.6 0 4.8 2.1 4.8 4.8 0 2.6-2.1 4.8-4.8 4.8z"/><path d="M120.1 77.3h-23c-2.6 0-4.8-2.1-4.8-4.8 0-2.6 2.1-4.8 4.8-4.8h23c2.6 0 4.8 2.1 4.8 4.8 0 2.6-2.2 4.8-4.8 4.8z"/><path d="M77 144.5c-39.7 0-72-32.3-72-72s32.3-72 72-72 72 32.3 72 72-32.3 72-72 72zM77 10c-34.4 0-62.4 28-62.4 62.4 0 34.4 28 62.4 62.4 62.4 34.4 0 62.4-28 62.4-62.4C139.4 38 111.4 10 77 10z"/></g></svg></div><div class="kg-transistor-content"><div class="kg-transistor-title">Members-only podcasts</div><div class="kg-transistor-description">Your Transistor podcasts will appear here. Members will see subscribe links based on their access level.</div></div></div></figure>';

const forPost = (attrs, frame) => {
    if (!localUtils.isPreview(frame)) {
        return attrs;
    }

    if (attrs.html && attrs.html.includes('data-kg-transistor-embed')) {
        attrs.html = attrs.html.replace(
            /<iframe[^>]*data-kg-transistor-embed[^>]*>\s*<\/iframe>\s*<script[^>]*>[\s\S]*?<\/script>\s*(?:<noscript>[\s\S]*?<\/noscript>)?/gi,
            TRANSISTOR_PLACEHOLDER
        );

        if (Object.hasOwn(attrs, 'plaintext')) {
            attrs.plaintext = htmlToPlaintext.excerpt(attrs.html);
        }

        if (!attrs.custom_excerpt && Object.hasOwn(attrs, 'excerpt')) {
            const plaintext = attrs.plaintext || htmlToPlaintext.excerpt(attrs.html);
            attrs.excerpt = plaintext.substring(0, 500);
        }
    }

    return attrs;
};

module.exports = {
    forPost
};
