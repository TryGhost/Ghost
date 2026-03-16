import {
    htmlAbsoluteToRelative,
    htmlRelativeToAbsolute,
    htmlToTransformReady
} from '@tryghost/url-utils/lib/utils';
import type {Card} from '../types.js';

const htmlCard: Card = {
    name: 'html',
    type: 'dom',
    config: {
        commentWrapper: true
    },

    render({payload, env: {dom}}) {
        if (!payload.html) {
            return dom.createTextNode('');
        }

        // use the SimpleDOM document to create a raw HTML section.
        // avoids parsing/rendering of potentially broken or unsupported HTML
        return dom.createRawHTMLSection(payload.html as string);
    },

    absoluteToRelative(payload, options) {
        payload.html = payload.html && htmlAbsoluteToRelative(payload.html as string, options.siteUrl, options);
        return payload;
    },

    relativeToAbsolute(payload, options) {
        payload.html = payload.html && htmlRelativeToAbsolute(payload.html as string, options.siteUrl, options.itemUrl ?? '', options);
        return payload;
    },

    toTransformReady(payload, options) {
        payload.html = payload.html && htmlToTransformReady(payload.html as string, options.siteUrl, options);
        return payload;
    }
};

export default htmlCard;
