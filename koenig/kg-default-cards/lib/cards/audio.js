const {
    absoluteToRelative,
    relativeToAbsolute,
    htmlAbsoluteToRelative,
    htmlRelativeToAbsolute,
    htmlToTransformReady,
    toTransformReady
} = require('@tryghost/url-utils/lib/utils');

const {
    hbs,
    dedent
} = require('../utils');

module.exports = {
    name: 'audio',
    type: 'dom',

    render({payload, env: {dom}, options = {}}) {
        if (!payload.src) {
            return dom.createTextNode('');
        }

        const frontendTemplate = hbs`
            <div class="kg-card kg-audio-card" data-kg-card="audio" style="display:flex">
                <img src="{{thumbnailSrc}}" alt="" width="100%" border="0" style="width: 150px;">
                <div style="height:100%;display:flex;flex-direction:column">
                    <div style="display:flex;justify-content:center">
                        {{fileName}}
                    </div>
                    <audio controls src="{{src}}" loop={{loop}}>
                        Your browser does not support the
                        <code>audio</code> element.
                    </audio>
                </div>
            </div>
        `;

        const emailTemplate = hbs`
            <div>
                Audio Card Placeholder
            </div>
        `;

        const renderTemplate = options.target === 'email' ? emailTemplate : frontendTemplate;

        const html = dedent(renderTemplate({
            src: payload.src,
            thumbnailSrc: payload.thumbnailSrc,
            loop: payload.loop,
            fileName: payload.fileName
        }));

        return dom.createRawHTMLSection(html);
    },

    absoluteToRelative(payload, options) {
        payload.src = payload.src && absoluteToRelative(payload.src, options.siteUrl, options);
        payload.thumbnailSrc = payload.thumbnailSrc && htmlAbsoluteToRelative(payload.thumbnailSrc, options.siteUrl, options);
        return payload;
    },

    relativeToAbsolute(payload, options) {
        payload.src = payload.src && relativeToAbsolute(payload.src, options.siteUrl, options.itemUrl, options);
        payload.thumbnailSrc = payload.thumbnailSrc && htmlRelativeToAbsolute(payload.thumbnailSrc, options.siteUrl, options.itemUrl, options);
        return payload;
    },

    toTransformReady(payload, options) {
        payload.src = payload.src && toTransformReady(payload.src, options.siteUrl, options);
        payload.thumbnailSrc = payload.thumbnailSrc && htmlToTransformReady(payload.thumbnailSrc, options.siteUrl, options);
        return payload;
    }
};
