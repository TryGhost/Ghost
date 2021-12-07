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
            <div class="kg-card kg-audio-card" data-kg-audio-src="{{src}}">
                <img src="{{thumbnailSrc}}" alt="audio-thumbnail" class="kg-audio-thumbnail">
                <div class="kg-player-container">
                    <audio src="{{src}}" preload="metadata"></audio>
                    <div class="kg-audio-title">{{fileName}}</div>
                    <div class="kg-player">
                        <button class="kg-audio-play-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                <path d="M23.14 10.608 2.253.164A1.559 1.559 0 0 0 0 1.557v20.887a1.558 1.558 0 0 0 2.253 1.392L23.14 13.393a1.557 1.557 0 0 0 0-2.785Z"/>
                            </svg>                      
                        </button>
                        <span class="kg-audio-current-time">0:00</span>
                        <div class="kg-audio-time">
                            /<span class="kg-audio-duration">0:00</span>
                        </div>
                        <input type="range" class="kg-audio-seek-slider" max="100" value="0">
                        <button class="kg-audio-playback-rate">1&#215;</button>
                        <button class="kg-audio-mute-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                <path d="M15.189 2.021a9.728 9.728 0 0 0-7.924 4.85.249.249 0 0 1-.221.133H5.25a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h1.794a.249.249 0 0 1 .221.133 9.73 9.73 0 0 0 7.924 4.85h.06a1 1 0 0 0 1-1V3.02a1 1 0 0 0-1.06-.998Z"/>
                            </svg>                                          
                        </button>
                        <input type="range" class="kg-audio-volume-slider" max="100" value="100">
                    </div>
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
