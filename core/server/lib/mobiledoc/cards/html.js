'use strict';

module.exports = {
    name: 'html',
    type: 'dom',
    render(opts) {
        let html = `<div class="kg-card-html">${opts.payload.html}</div>`;

        // use the SimpleDOM document to create a raw HTML section.
        // avoids parsing/rendering of potentially broken or unsupported HTML
        let element = opts.env.dom.createRawHTMLSection(html);

        return element;
    }
};
