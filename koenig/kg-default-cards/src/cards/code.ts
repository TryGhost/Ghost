import {
    htmlAbsoluteToRelative,
    htmlRelativeToAbsolute,
    htmlToTransformReady
} from '@tryghost/url-utils/lib/utils';
import type {Card} from '../types.js';

const codeCard: Card = {
    name: 'code',
    type: 'dom',

    render({payload, env: {dom}}) {
        if (!payload.code) {
            return dom.createTextNode('');
        }

        const pre = dom.createElement('pre');
        const code = dom.createElement('code');

        if (payload.language) {
            code.setAttribute('class', `language-${payload.language}`);
        }

        code.appendChild(dom.createTextNode(payload.code as string));
        pre.appendChild(code);

        if (payload.caption) {
            const figure = dom.createElement('figure');
            figure.setAttribute('class', 'kg-card kg-code-card');
            figure.appendChild(pre);

            const figcaption = dom.createElement('figcaption');
            figcaption.appendChild(dom.createRawHTMLSection(payload.caption as string));
            figure.appendChild(figcaption);

            return figure;
        } else {
            return pre;
        }
    },

    absoluteToRelative(payload, options) {
        payload.caption = payload.caption && htmlAbsoluteToRelative(payload.caption as string, options.siteUrl, options);
        return payload;
    },

    relativeToAbsolute(payload, options) {
        payload.caption = payload.caption && htmlRelativeToAbsolute(payload.caption as string, options.siteUrl, options.itemUrl ?? '', options);
        return payload;
    },

    toTransformReady(payload, options) {
        payload.caption = payload.caption && htmlToTransformReady(payload.caption as string, options.siteUrl, options);
        return payload;
    }
};

export default codeCard;
