module.exports = {
    name: 'embed',
    type: 'dom',
    render(opts) {
        if (!opts.payload.html) {
            return '';
        }

        let {payload, env: {dom}} = opts;

        let figure = dom.createElement('figure');
        figure.setAttribute('class', 'kg-card kg-embed-card');

        let html = dom.createRawHTMLSection(payload.html);
        figure.appendChild(html);

        if (payload.caption) {
            let figcaption = dom.createElement('figcaption');
            figcaption.appendChild(dom.createRawHTMLSection(payload.caption));
            figure.appendChild(figcaption);
        }

        return figure;
    }
};
