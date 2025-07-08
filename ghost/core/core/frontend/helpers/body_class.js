// # Body Class Helper
// Usage: `{{body_class}}`
//
// Output classes for the body element
const {settingsCache} = require('../services/proxy');
const {generateCustomFontBodyClass, isValidCustomFont, isValidCustomHeadingFont} = require('@tryghost/custom-fonts');
const {SafeString} = require('../services/handlebars');

/**
 * @typedef {import('@tryghost/custom-fonts').FontSelection} FontSelection
 */

// We use the name body_class to match the helper for consistency
module.exports = function body_class(options) { // eslint-disable-line camelcase
    let classes = [];
    const context = options.data.root.context || [];
    const obj = this.post || this.page;
    const tags = obj && obj.tags ? obj.tags : [];
    const isPage = !!(this.page);

    if (context.includes('home')) {
        classes.push('home-template');
    } else if (context.includes('post') && obj && !isPage) {
        classes.push('post-template');
    } else if (context.includes('page') && obj && isPage) {
        classes.push('page-template');
        classes.push(`page-${obj.slug}`);
    } else if (context.includes('tag') && this.tag) {
        classes.push('tag-template');
        classes.push(`tag-${this.tag.slug}`);
    } else if (context.includes('author') && this.author) {
        classes.push('author-template');
        classes.push(`author-${this.author.slug}`);
    } else if (context.includes('private')) {
        classes.push('private-template');
    }

    if (tags) {
        classes = classes.concat(
            tags.map(({slug}) => `tag-${slug}`)
        );
    }

    if (context.includes('paged')) {
        classes.push('paged');
    }

    // Check if if the request is for a site preview, in which case we **always** use the custom font values
    // from the passed in data, even when they're empty strings or settings cache has values.
    const isSitePreview = options.data?.site?._preview ?? false;
    // Taking the fonts straight from the passed in data, as they can't be used from the
    // settings cache for the theme preview until the settings are saved. Once saved,
    // we need to use the settings cache to provide the correct CSS injection.
    const headingFont = isSitePreview ? options.data?.site?.heading_font : settingsCache.get('heading_font');
    const bodyFont = isSitePreview ? options.data?.site?.body_font : settingsCache.get('body_font');

    if ((typeof headingFont === 'string' && isValidCustomHeadingFont(headingFont)) ||
        (typeof bodyFont === 'string' && isValidCustomFont(bodyFont))) {
        /** @type FontSelection */
        const fontSelection = {};

        if (headingFont) {
            fontSelection.heading = headingFont;
        }
        if (bodyFont) {
            fontSelection.body = bodyFont;
        }
        const customBodyClasses = generateCustomFontBodyClass(fontSelection);
        classes.push(new SafeString(customBodyClasses));
    }

    classes = classes.join(' ').trim();

    return new SafeString(classes);
};
