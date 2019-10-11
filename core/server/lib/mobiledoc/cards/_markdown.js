// this is a function so that when it's aliased across multiple cards we do not
// end up modifying the object by reference
module.exports = function markdownCardDefinition() {
    return {
        name: 'markdown',
        type: 'dom',
        config: {
            commentWrapper: true
        },

        render: function (opts) {
            let converters = require('../converters');
            let payload = opts.payload;
            let version = opts.options && opts.options.version || 2;
            // convert markdown to HTML ready for insertion into dom
            let html = converters.markdownConverter.render(payload.markdown || '');

            if (!html) {
                return '';
            }

            /**
             * @deprecated Ghost 1.0's markdown-only renderer wrapped cards. Remove in Ghost 3.0
             */
            if (version === 1) {
                html = `<div class="kg-card-markdown">${html}</div>`;
            }

            // use the SimpleDOM document to create a raw HTML section.
            // avoids parsing/rendering of potentially broken or unsupported HTML
            return opts.env.dom.createRawHTMLSection(html);
        },

        absoluteToRelative(urlUtils, payload, options) {
            payload.markdown = payload.markdown && urlUtils.markdownAbsoluteToRelative(payload.markdown, options);
            return payload;
        },

        relativeToAbsolute(urlUtils, payload, options) {
            payload.markdown = payload.markdown && urlUtils.markdownRelativeToAbsolute(payload.markdown, options);
            return payload;
        }
    };
};
