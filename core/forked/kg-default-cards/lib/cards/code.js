const {
    htmlAbsoluteToRelative,
    htmlRelativeToAbsolute
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

        let block;

        if (payload.caption) {
            block = dom.createElement('figure');
            block.setAttribute('class', 'kg-card kg-code-card');
            block.appendChild(pre);

            let figcaption = dom.createElement('figcaption');
            figcaption.appendChild(dom.createRawHTMLSection(payload.caption));
            block.appendChild(figcaption);
        } else {
            block = pre;
        }

        // ---CUSTOM CODE START---
        if (payload.line) {
            pre.setAttribute('data-line', payload.line);
        }

        if (payload.filename) {
            const wrapper = dom.createElement('div');
            const filename = dom.createElement('div');

            wrapper.setAttribute('class', 'code-wrapper');
            filename.appendChild(dom.createTextNode(payload.filename));
            filename.setAttribute('class', 'code-filename');

            pre.setAttribute('data-filename', payload.filename);
            wrapper.appendChild(filename);
            wrapper.appendChild(block);

            block = wrapper;
        }
        // ---CUSTOM CODE END---

        return block;
    },

    absoluteToRelative(payload, options) {
        payload.caption = payload.caption && htmlAbsoluteToRelative(payload.caption, options.siteUrl, options);
        return payload;
    },

    relativeToAbsolute(payload, options) {
        payload.caption = payload.caption && htmlRelativeToAbsolute(payload.caption, options.siteUrl, options.itemUrl, options);
        return payload;
    }
};
