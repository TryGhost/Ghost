const {
    absoluteToRelative,
    htmlAbsoluteToRelative,
    relativeToAbsolute,
    htmlRelativeToAbsolute,
    toTransformReady,
    htmlToTransformReady
} = require('@tryghost/url-utils/lib/utils');
const {
    hbs,
    dedent
} = require('../utils');

module.exports = {
    name: 'header',
    type: 'dom',

    render({payload, env: {dom}}) {
        if (!payload.header && !payload.subheader && (!payload.buttonEnabled || (!payload.buttonUrl || !payload.buttonText))) {
            return dom.createTextNode('');
        }

        const frontendTemplate = hbs`
            <div class="kg-header-card kg-width-full kg-size-{{size}} kg-style-{{style}}" style="{{backgroundImageStyle}}">
                <h2 class="kg-header-card-header">{{{header}}}</h2>
                {{#if this.hasSubheader}}
                    <h3 class="kg-header-card-subheader">{{{subheader}}}</h3>
                {{/if}}
                {{#if buttonEnabled}}
                    <a href="{{buttonUrl}}" class="kg-header-card-button">
                        <span>
                            {{buttonText}}
                        </span>
                    </a>
                {{/if}}
            </div>
        `;

        const templateData = {
            size: payload.size,
            style: payload.style,
            buttonEnabled: payload.buttonEnabled && Boolean(payload.buttonUrl) && Boolean(payload.buttonText),
            buttonUrl: payload.buttonUrl,
            buttonText: payload.buttonText,
            header: payload.header,
            subheader: payload.subheader,
            hasSubheader: payload.subheader && Boolean(payload.subheader.replace(/(<br>)+$/g).trim()),
            backgroundImageStyle: payload.style === 'image' ? `background-image: url(${payload.backgroundImageSrc})` : ''
        };

        const html = dedent(frontendTemplate(templateData));

        return dom.createRawHTMLSection(html);
    },

    absoluteToRelative(payload, options) {
        payload.buttonUrl = payload.buttonUrl && absoluteToRelative(payload.buttonUrl, options.siteUrl, options);
        payload.backgroundImageSrc = payload.backgroundImageSrc && absoluteToRelative(payload.backgroundImageSrc, options.siteUrl, options);

        payload.header = payload.header && htmlAbsoluteToRelative(payload.header, options.siteUrl, options);
        payload.subheader = payload.subheader && htmlAbsoluteToRelative(payload.subheader, options.siteUrl, options);
        return payload;
    },

    relativeToAbsolute(payload, options) {
        payload.buttonUrl = payload.buttonUrl && relativeToAbsolute(payload.buttonUrl, options.siteUrl, options.itemUrl, options);
        payload.backgroundImageSrc = payload.backgroundImageSrc && relativeToAbsolute(payload.backgroundImageSrc, options.siteUrl, options.itemUrl, options);

        payload.header = payload.header && htmlRelativeToAbsolute(payload.header, options.siteUrl, options.itemUrl, options);
        payload.subheader = payload.subheader && htmlRelativeToAbsolute(payload.subheader, options.siteUrl, options.itemUrl, options);
        return payload;
    },

    toTransformReady(payload, options) {
        payload.buttonUrl = payload.buttonUrl && toTransformReady(payload.buttonUrl, options.siteUrl, options.itemUrl, options);
        payload.backgroundImageSrc = payload.backgroundImageSrc && toTransformReady(payload.backgroundImageSrc, options.siteUrl, options.itemUrl, options);

        payload.header = payload.header && htmlToTransformReady(payload.header, options.siteUrl, options.itemUrl, options);
        payload.subheader = payload.subheader && htmlToTransformReady(payload.subheader, options.siteUrl, options.itemUrl, options);
        return payload;
    }
};
