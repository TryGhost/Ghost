const createCard = require('../create-card');

module.exports = createCard({
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
            figure.setAttribute('class', `${figure.getAttribute('class')} kg-card-hascaption`);
        }

        return figure;
    },

    absoluteToRelative(urlUtils, payload, options) {
        payload.caption = payload.caption && urlUtils.htmlAbsoluteToRelative(payload.caption, options);
        return payload;
    },

    relativeToAbsolute(urlUtils, payload, options) {
        payload.caption = payload.caption && urlUtils.htmlRelativeToAbsolute(payload.caption, options);
        return payload;
    }
});
