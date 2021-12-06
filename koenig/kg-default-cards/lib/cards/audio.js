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
            <div class="kg-card kg-audio-card" style="display:flex" data-kg-audio-src="{{src}}">
                <img src="{{thumbnailSrc}}" alt="" border="0" style="max-width: 150px;height: 130px">
                <div class="kg-audio-player-container">
                    <audio src="{{src}}" preload="metadata" loop={{loop}}></audio>
                    <p>{{fileName}}</p>
                    <button class="kg-audio-play-icon">&gt;</button>
                    <span class="kg-audio-current-time">0:00</span>
                    <input type="range" class="kg-audio-seek-slider" max="100" value="0">
                    <span class="kg-audio-duration" class="time">0:00</span>
                    <output class="kg-audio-volume-output">100</output>
                    <input type="range" class="kg-audio-volume-slider" max="100" value="100">
                    <button class="kg-audio-mute-icon">M</button>
                    <button class="kg-audio-playback-rate">1x</button>
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
