const {
    htmlAbsoluteToRelative,
    htmlRelativeToAbsolute,
    htmlToTransformReady
} = require('@tryghost/url-utils/lib/utils');

module.exports = {
    name: 'code',
    type: 'dom',

    render({payload, env: {dom}}) {
        if (!payload.code) {
            return dom.createTextNode('');
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

    absoluteToRelative(payload, options) {
        payload.caption = payload.caption && htmlAbsoluteToRelative(payload.caption, options.siteUrl, options);
        return payload;
    },

    relativeToAbsolute(payload, options) {
        payload.caption = payload.caption && htmlRelativeToAbsolute(payload.caption, options.siteUrl, options.itemUrl, options);
        return payload;
    },

    toTransformReady(payload, options) {
        payload.caption = payload.caption && htmlToTransformReady(payload.caption, options.siteUrl, options);
        return payload;
    }
};
