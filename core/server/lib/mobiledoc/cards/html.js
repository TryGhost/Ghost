'use strict';

module.exports = {
    name: 'html',
    type: 'dom',
    render(opts) {
        let payload = opts.payload;
        let dom = opts.env.dom;
        let caption = '';

        if (payload.caption) {
            caption = `<p>${payload.caption}</p>`;
        }

        let html = `<div class="kg-card-html">${payload.html}${caption}</div>`;

        // use the SimpleDOM document to create a raw HTML section.
        // avoids parsing/rendering of potentially broken or unsupported HTML
        let element = dom.createRawHTMLSection(html);

        return element;
    }
};
