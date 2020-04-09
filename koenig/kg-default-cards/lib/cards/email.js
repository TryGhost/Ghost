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

        // perform replacements
        const replacementMap = options.replacementMap || {};
        payload.html = payload.html.replace(/\{(\w*?)(?:, "(.*?)")?\}/g, (match, key, fallback) => {
            return replacementMap[key] || fallback || '';
        });

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
