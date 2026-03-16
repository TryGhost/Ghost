import {
    htmlAbsoluteToRelative,
    htmlRelativeToAbsolute,
    htmlToTransformReady
} from '@tryghost/url-utils/lib/utils';
import {hbs, dedent} from '../utils/index.js';
import type {Card} from '../types.js';

const calloutCard: Card = {
    name: 'callout',
    type: 'dom',

    render({payload, env: {dom}}) {
        if (!payload.calloutText) {
            return dom.createTextNode('');
        }

        const template = hbs`
            <div class="kg-card kg-callout-card kg-callout-card-{{backgroundColor}}">
                {{#if calloutEmoji}}
                    <div class="kg-callout-emoji">{{calloutEmoji}}</div>
                {{/if}}
                    <div class="kg-callout-text">{{{calloutText}}}</div>
            </div>
        `;

        const html = dedent(template({
            calloutEmoji: payload.calloutEmoji,
            calloutText: payload.calloutText,
            backgroundColor: payload.backgroundColor
        }));

        return dom.createRawHTMLSection(html);
    },

    absoluteToRelative(payload, options) {
        payload.calloutText = payload.calloutText && htmlAbsoluteToRelative(payload.calloutText as string, options.siteUrl, options);
        return payload;
    },

    relativeToAbsolute(payload, options) {
        payload.calloutText = payload.calloutText && htmlRelativeToAbsolute(payload.calloutText as string, options.siteUrl, options.itemUrl ?? '', options);
        return payload;
    },

    toTransformReady(payload, options) {
        payload.calloutText = payload.calloutText && htmlToTransformReady(payload.calloutText as string, options.siteUrl, options);
        return payload;
    }
};

export default calloutCard;
