import {render as markdownHtmlRender} from '@tryghost/kg-markdown-html-renderer';
import {
    markdownRelativeToAbsolute,
    markdownAbsoluteToRelative,
    markdownToTransformReady
} from '@tryghost/url-utils/lib/utils';
import type {Card} from '../types.js';

const markdownCard: Card = {
    name: 'markdown',
    type: 'dom',
    config: {
        commentWrapper: true
    },

    render({payload, env: {dom}, options}) {
        // convert markdown to HTML ready for insertion into dom
        const html = markdownHtmlRender((payload.markdown as string) || '', options);

        if (!html) {
            return dom.createTextNode('');
        }

        // use the SimpleDOM document to create a raw HTML section.
        // avoids parsing/rendering of potentially broken or unsupported HTML
        return dom.createRawHTMLSection(html);
    },

    absoluteToRelative(payload, options) {
        payload.markdown = payload.markdown && markdownAbsoluteToRelative(payload.markdown as string, options.siteUrl, options);
        return payload;
    },

    relativeToAbsolute(payload, options) {
        payload.markdown = payload.markdown && markdownRelativeToAbsolute(payload.markdown as string, options.siteUrl, options.itemUrl ?? '', options);
        return payload;
    },

    toTransformReady(payload, options) {
        payload.markdown = payload.markdown && markdownToTransformReady(payload.markdown as string, options.siteUrl, options);
        return payload;
    }
};

export default markdownCard;
