module.exports = {
    name: 'markdown',
    type: 'dom',
    render: function (opts) {
        let converters = require('../converters');
        let payload = opts.payload;
        let version = opts.options.version;
        // convert markdown to HTML ready for insertion into dom
        let html = converters.markdownConverter.render(payload.markdown || '');

        // Ghost 1.0's markdown-only renderer wrapped cards
        if (version === 1) {
            html = `<div class="kg-card-markdown">${html}</div>`;
        }

        // use the SimpleDOM document to create a raw HTML section.
        // avoids parsing/rendering of potentially broken or unsupported HTML
        return opts.env.dom.createRawHTMLSection(html);
    }
};
