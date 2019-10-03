const createCard = require('../create-card');

module.exports = createCard({
    name: 'code',
    type: 'dom',
    render(opts) {
        let payload = opts.payload;
        let dom = opts.env.dom;

        if (!payload.code) {
            return '';
        }

        let pre = dom.createElement('pre');
        let code = dom.createElement('code');

        if (payload.language) {
            code.setAttribute('class', `language-${payload.language}`);
        }

        code.appendChild(dom.createTextNode(payload.code));
        pre.appendChild(code);

        if (payload.caption) {
            let figure = dom.createElement('figure');
            figure.setAttribute('class', 'kg-card kg-code-card');
            figure.appendChild(pre);

            let figcaption = dom.createElement('figcaption');
            figcaption.appendChild(dom.createRawHTMLSection(payload.caption));
            figure.appendChild(figcaption);

            return figure;
        } else {
            return pre;
        }
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
