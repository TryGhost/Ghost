const createCard = require('../create-card');

module.exports = createCard({
    name: 'html',
    type: 'dom',
    config: {
        commentWrapper: true
    },
    render(opts) {
        if (!opts.payload.html) {
            return '';
        }

        // use the SimpleDOM document to create a raw HTML section.
        // avoids parsing/rendering of potentially broken or unsupported HTML
        return opts.env.dom.createRawHTMLSection(opts.payload.html);
    },

    absoluteToRelative(urlUtils, payload, options) {
        payload.html = payload.html && urlUtils.htmlAbsoluteToRelative(payload.html, options);
        return payload;
    },

    relativeToAbsolute(urlUtils, payload, options) {
        payload.html = payload.html && urlUtils.htmlRelativeToAbsolute(payload.html, options);
        return payload;
    }
});
