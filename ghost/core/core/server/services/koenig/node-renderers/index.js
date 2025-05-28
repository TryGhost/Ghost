/**
 * Custom renderers for lexical nodes
 *
 * Export an object where keys are node types and values are renderer functions.
 * Example:
 * module.exports = {
 *   image: (node, options) => ({ element: customImageElement, type: 'inner' })
 * };
 */
module.exports = {
    audio: require('./audio-renderer'),
    bookmark: require('./bookmark-renderer'),
    button: require('./button-renderer'),
    callout: require('./callout-renderer'),
    'call-to-action': require('./call-to-action-renderer'),
    codeblock: require('./codeblock-renderer'),
    'email-cta': require('./email-cta-renderer'),
    email: require('./email-renderer'),
    embed: require('./embed-renderer'),
    file: require('./file-renderer'),
    gallery: require('./gallery-renderer'),
    header: {
        1: require('./header-v1-renderer'),
        2: require('./header-v2-renderer')
    },
    horizontalrule: require('./horizontalrule-renderer'),
    html: require('./html-renderer'),
    image: require('./image-renderer'),
    markdown: require('./markdown-renderer'),
    paywall: require('./paywall-renderer'),
    product: require('./product-renderer'),
    signup: require('./signup-renderer'),
    toggle: require('./toggle-renderer'),
    video: require('./video-renderer')
};