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
                        <button class="kg-audio-pause-icon kg-audio-hide">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                <rect x="3" y="1" width="7" height="22" rx="1.5" ry="1.5"/>
                                <rect x="14" y="1" width="7" height="22" rx="1.5" ry="1.5"/>
                            </svg>
                        </button>
                        <span class="kg-audio-current-time">0:00</span>
                        <div class="kg-audio-time">
                            /<span class="kg-audio-duration">0:00</span>
                        </div>
                        <input type="range" class="kg-audio-seek-slider" max="100" value="0">
                        <button class="kg-audio-playback-rate">1&#215;</button>
                        <button class="kg-audio-unmute-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                <path d="M15.189 2.021a9.728 9.728 0 0 0-7.924 4.85.249.249 0 0 1-.221.133H5.25a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h1.794a.249.249 0 0 1 .221.133 9.73 9.73 0 0 0 7.924 4.85h.06a1 1 0 0 0 1-1V3.02a1 1 0 0 0-1.06-.998Z"/>
                            </svg>
                        </button>
                        <button class="kg-audio-mute-icon kg-audio-hide">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                <path d="M16.177 4.3a.248.248 0 0 0 .073-.176v-1.1a1 1 0 0 0-1.061-1 9.728 9.728 0 0 0-7.924 4.85.249.249 0 0 1-.221.133H5.25a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h.114a.251.251 0 0 0 .177-.073ZM23.707 1.706A1 1 0 0 0 22.293.292l-22 22a1 1 0 0 0 0 1.414l.009.009a1 1 0 0 0 1.405-.009l6.63-6.631A.251.251 0 0 1 8.515 17a.245.245 0 0 1 .177.075 10.081 10.081 0 0 0 6.5 2.92 1 1 0 0 0 1.061-1V9.266a.247.247 0 0 1 .073-.176Z"/>
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
