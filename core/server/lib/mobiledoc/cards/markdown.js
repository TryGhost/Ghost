const createCard = require('../create-card');

module.exports = createCard({
    name: 'markdown',
    type: 'dom',
    render: function (opts) {
        let converters = require('../converters');
        let payload = opts.payload;
        // convert markdown to HTML ready for insertion into dom
        let html = converters.markdownConverter.render(payload.markdown || '');

        if (!html) {
            return '';
        }

        // use the SimpleDOM document to create a raw HTML section.
        // avoids parsing/rendering of potentially broken or unsupported HTML
        return opts.env.dom.createRawHTMLSection(html);
    }
});
