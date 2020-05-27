const {
    htmlAbsoluteToRelative,
    htmlRelativeToAbsolute
} = require('@tryghost/url-utils/lib/utils');

module.exports = {
    name: 'email',
    type: 'dom',

    render({payload, env: {dom}, options = {}}) {
        if (!payload.html || options.target !== 'email') {
            return dom.createTextNode('');
        }

        // wrap the replacement %%{replacement}%% so that when performing replacements
        // it's less likely for code samples to be mistaken for our replacement strings
        // NOTE: must be plain text rather than a custom element so that it's not removed by html->plaintext conversion
        payload.html = payload.html.replace(/\{(\w*?)(?:,? *"(.*?)")?\}/g, '%%$&%%');

        // use the SimpleDOM document to create a raw HTML section.
        // avoids parsing/rendering of potentially broken or unsupported HTML
        return dom.createRawHTMLSection(payload.html);
    },

    absoluteToRelative(payload, options) {
        payload.html = payload.html && htmlAbsoluteToRelative(payload.html, options.siteUrl, options);
        return payload;
    },

    relativeToAbsolute(payload, options) {
        payload.html = payload.html && htmlRelativeToAbsolute(payload.html, options.siteUrl, options.itemUrl, options);
        return payload;
    }
};
