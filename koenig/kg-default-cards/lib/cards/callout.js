const {
    htmlAbsoluteToRelative,
    htmlRelativeToAbsolute,
    htmlToTransformReady
} = require('@tryghost/url-utils/lib/utils');
const {
    hbs,
    dedent
} = require('../utils');

module.exports = {
    name: 'callout',
    type: 'dom',

    render({payload, env: {dom}}) {
        if (!payload.calloutText) {
            return dom.createTextNode('');
        }

        const template = hbs`
            <div style="display: flex;" data-kg-card="callout">
                <div style="padding-right: 10px;">{{calloutEmoji}}</div>
                <div>{{{calloutText}}}</div>
            </div>
        `;

        const html = dedent(template({
            calloutEmoji: payload.calloutEmoji,
            calloutText: payload.calloutText
        }));

        return dom.createRawHTMLSection(html);
    },

    absoluteToRelative(payload, options) {
        payload.calloutText = payload.calloutText && htmlAbsoluteToRelative(payload.calloutText, options.siteUrl, options);
        return payload;
    },

    relativeToAbsolute(payload, options) {
        payload.calloutText = payload.calloutText && htmlRelativeToAbsolute(payload.calloutText, options.siteUrl, options.itemUrl, options);
        return payload;
    },

    toTransformReady(payload, options) {
        payload.calloutText = payload.calloutText && htmlToTransformReady(payload.calloutText, options.siteUrl, options);
        return payload;
    }
};
