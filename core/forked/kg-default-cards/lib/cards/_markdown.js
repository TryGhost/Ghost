const markdownHtmlRenderer = require('@tryghost/kg-markdown-html-renderer');
const {
    markdownAbsoluteToRelative,
    markdownRelativeToAbsolute
} = require('@tryghost/url-utils/lib/utils');

// this is a function so that when it's aliased across multiple cards we do not
// end up modifying the object by reference
module.exports = function markdownCardDefinition() {
    return {
        name: 'markdown',
        type: 'dom',
        config: {
            commentWrapper: true
        },

        render: function ({payload, env: {dom}, options}) {
            let version = options && options.version || 2;
            // convert markdown to HTML ready for insertion into dom
            let html = markdownHtmlRenderer.render(payload.markdown || '');

            if (!html) {
                return dom.createTextNode('');
            }

            /**
             * @deprecated Ghost 1.0's markdown-only renderer wrapped cards. Remove in Ghost 3.0
             */
            if (version === 1) {
                html = `<div class="kg-card-markdown">${html}</div>`;
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
        }
    };
};
