const {
    absoluteToRelative,
    relativeToAbsolute,
    toTransformReady
} = require('@tryghost/url-utils/lib/utils');
const {
    hbs,
    dedent
} = require('../utils');

module.exports = {
    name: 'button',
    type: 'dom',

    render({payload, env: {dom}}) {
        if (!payload.buttonUrl || !payload.buttonText) {
            return dom.createTextNode('');
        }

        const template = hbs`
            <div class="btn btn-accent {{#if centered}}align-center{{/if}}" data-kg-card="button">
                <a href="{{buttonUrl}}">{{buttonText}}</a>
            </div>
        `;

        const html = dedent(template({
            buttonUrl: payload.buttonUrl,
            buttonText: payload.buttonText,
            centered: payload.alignment === 'center'
        }));

        return dom.createRawHTMLSection(html);
    },

    absoluteToRelative(payload, options) {
        payload.buttonUrl = payload.buttonUrl && absoluteToRelative(payload.buttonUrl, options.siteUrl, options);
        return payload;
    },

    relativeToAbsolute(payload, options) {
        payload.buttonUrl = payload.buttonUrl && relativeToAbsolute(payload.buttonUrl, options.siteUrl, options.itemUrl, options);
        return payload;
    },

    toTransformReady(payload, options) {
        payload.buttonUrl = payload.buttonUrl && toTransformReady(payload.buttonUrl, options.siteUrl, options.itemUrl, options);
        return payload;
    }
};
