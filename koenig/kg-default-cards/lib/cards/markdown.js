const markdownHtmlRenderer = require('@tryghost/kg-markdown-html-renderer');
const {
    markdownRelativeToAbsolute,
    markdownAbsoluteToRelative,
    markdownToTransformReady
} = require('@tryghost/url-utils/lib/utils');

module.exports = {
    name: 'markdown',
    type: 'dom',
    config: {
        commentWrapper: true
    },

    render: function ({payload, env: {dom}, options}) {
        // convert markdown to HTML ready for insertion into dom
        let html = markdownHtmlRenderer.render(payload.markdown || '', options);

        if (!html) {
            return dom.createTextNode('');
        }

        // use the SimpleDOM document to create a raw HTML section.
        // avoids parsing/rendering of potentially broken or unsupported HTML
        return dom.createRawHTMLSection(html);
    },

    absoluteToRelative(payload, options) {
        payload.markdown = payload.markdown && markdownAbsoluteToRelative(
            payload.markdown,
            options.siteUrl,
            options
        );
        return payload;
    },

    relativeToAbsolute(payload, options) {
        payload.markdown = payload.markdown && markdownRelativeToAbsolute(
            payload.markdown,
            options.siteUrl,
            options.itemUrl,
            options
        );
        return payload;
    },

    toTransformReady(payload, options) {
        payload.markdown = payload.markdown && markdownToTransformReady(
            payload.markdown,
            options.siteUrl,
            options
        );
        return payload;
    }
};
