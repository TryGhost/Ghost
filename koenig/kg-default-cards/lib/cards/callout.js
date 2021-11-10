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
            <div class="kg-callout-card">
                <div class="kg-callout-emoji">{{calloutEmoji}}</div>
                <div class="kg-callout-text gh-content">{{{calloutText}}}</div>
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
