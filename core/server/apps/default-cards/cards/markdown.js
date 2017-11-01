module.exports = {
    name: 'card-markdown',
    type: 'dom',
    render: function (opts) {
        var markdownConverter = require('../../../utils/markdown-converter'),
            html, element;

        // convert markdown to HTML ready for insertion into dom
        html = '<div class="kg-card-markdown">'
            + markdownConverter.render(opts.payload.markdown || '')
            + '</div>';

        // use the SimpleDOM document to create a raw HTML section.
        // avoids parsing/rendering of potentially broken or unsupported HTML
        element = opts.env.dom.createRawHTMLSection(html);

        return element;
    }
};
