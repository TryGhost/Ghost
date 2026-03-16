import {
    absoluteToRelative,
    htmlAbsoluteToRelative,
    relativeToAbsolute,
    htmlRelativeToAbsolute,
    toTransformReady,
    htmlToTransformReady
} from '@tryghost/url-utils/lib/utils';
import {
    hbs,
    dedent
} from '../utils/index.js';
import type {Card} from '../types.js';

interface VideoPayload {
    src?: string;
    loop?: boolean;
    width?: number;
    height?: number;
    cardWidth?: string;
    caption?: string;
    customThumbnailSrc?: string;
    thumbnailSrc?: string;
}

const videoCard: Card = {
    name: 'video',
    type: 'dom',

    render({payload: _payload, env: {dom}, options = {}}) {
        const payload = _payload as VideoPayload;
        if (!payload.src) {
            return dom.createTextNode('');
        }

        const hideControlsClass = payload.loop ? ' kg-video-hide' : '';

        const frontendTemplate = hbs`
            <figure class="{{cardClasses}}">
                <div class="kg-video-container">
                    <video src="{{payload.src}}" poster="{{posterSpacerSrc}}" width="{{payload.width}}" height="{{payload.height}}"{{#if payload.loop}} loop autoplay muted{{/if}} playsinline preload="metadata" style="background: transparent url('{{thumbnailSrc}}') 50% 50% / cover no-repeat;" /></video>
                    <div class="kg-video-overlay">
                        <button class="kg-video-large-play-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                <path d="M23.14 10.608 2.253.164A1.559 1.559 0 0 0 0 1.557v20.887a1.558 1.558 0 0 0 2.253 1.392L23.14 13.393a1.557 1.557 0 0 0 0-2.785Z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="kg-video-player-container${hideControlsClass}">
                        <div class="kg-video-player">
                            <button class="kg-video-play-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                    <path d="M23.14 10.608 2.253.164A1.559 1.559 0 0 0 0 1.557v20.887a1.558 1.558 0 0 0 2.253 1.392L23.14 13.393a1.557 1.557 0 0 0 0-2.785Z"/>
                                </svg>
                            </button>
                            <button class="kg-video-pause-icon kg-video-hide">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                    <rect x="3" y="1" width="7" height="22" rx="1.5" ry="1.5"/>
                                    <rect x="14" y="1" width="7" height="22" rx="1.5" ry="1.5"/>
                                </svg>
                            </button>
                            <span class="kg-video-current-time">0:00</span>
                            <div class="kg-video-time">
                                /<span class="kg-video-duration">{{duration}}</span>
                            </div>
                            <input type="range" class="kg-video-seek-slider" max="100" value="0">
                            <button class="kg-video-playback-rate">1&#215;</button>
                            <button class="kg-video-unmute-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                    <path d="M15.189 2.021a9.728 9.728 0 0 0-7.924 4.85.249.249 0 0 1-.221.133H5.25a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h1.794a.249.249 0 0 1 .221.133 9.73 9.73 0 0 0 7.924 4.85h.06a1 1 0 0 0 1-1V3.02a1 1 0 0 0-1.06-.998Z"/>
                                </svg>
                            </button>
                            <button class="kg-video-mute-icon kg-video-hide">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                    <path d="M16.177 4.3a.248.248 0 0 0 .073-.176v-1.1a1 1 0 0 0-1.061-1 9.728 9.728 0 0 0-7.924 4.85.249.249 0 0 1-.221.133H5.25a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h.114a.251.251 0 0 0 .177-.073ZM23.707 1.706A1 1 0 0 0 22.293.292l-22 22a1 1 0 0 0 0 1.414l.009.009a1 1 0 0 0 1.405-.009l6.63-6.631A.251.251 0 0 1 8.515 17a.245.245 0 0 1 .177.075 10.081 10.081 0 0 0 6.5 2.92 1 1 0 0 0 1.061-1V9.266a.247.247 0 0 1 .073-.176Z"/>
                                </svg>
                            </button>
                            <input type="range" class="kg-video-volume-slider" max="100" value="100">
                        </div>
                    </div>
                </div>
                {{#if payload.caption}}
                    <figcaption>{{{payload.caption}}}</figcaption>
                {{/if}}
            </figure>
        `;

        const emailTemplate = hbs`
            <figure class="{{cardClasses}}">
                <!--[if !mso !vml]-->
                <a class="kg-video-preview" href="{{postUrl}}" aria-label="Play video" style="mso-hide: all">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" background="{{thumbnailSrc}}" role="presentation" style="background: url('{{thumbnailSrc}}') left top / cover; mso-hide: all">
                        <tr style="mso-hide: all">
                            <td width="25%" style="visibility: hidden; mso-hide: all">
                                <img src="{{emailSpacerSrc}}" alt="" width="100%" border="0" style="height: auto; opacity: 0; visibility: hidden; mso-hide: all;">
                            </td>
                            <td width="50%" align="center" valign="middle" style="vertical-align: middle; mso-hide: all;">
                                <div class="kg-video-play-button" style="mso-hide: all"><div style="mso-hide: all"></div></div>
                            </td>
                            <td width="25%" style="mso-hide: all">&nbsp;</td>
                        </tr>
                    </table>
                </a>
                <!--[endif]-->

                <!--[if vml]>
                <v:group xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" coordsize="{{emailTemplateMaxWidth}},{{spacerHeight}}" coordorigin="0,0" href="{{postUrl}}" style="width:{{emailTemplateMaxWidth}}px;height:{{spacerHeight}}px;">
                    <v:rect fill="t" stroked="f" style="position:absolute;width:{{emailTemplateMaxWidth}};height:{{spacerHeight}};"><v:fill src="{{payload.thumbnailSrc}}" type="frame"/></v:rect>
                    <v:oval fill="t" strokecolor="white" strokeweight="4px" style="position:absolute;left:{{outlookCircleLeft}};top:{{outlookCircleTop}};width:78;height:78"><v:fill color="black" opacity="30%" /></v:oval>
                    <v:shape coordsize="24,32" path="m,l,32,24,16,xe" fillcolor="white" stroked="f" style="position:absolute;left:{{outlookPayLeft}};top:{{outlookPlayTop}};width:30;height:34;" />
                </v:group>
                <![endif]-->

                {{#if caption}}
                    <figcaption>{{{payload.caption}}}</figcaption>
                {{/if}}
            </figure>
        `;

        const cardClasses = ['kg-card kg-video-card'];
        if (payload.cardWidth) {
            cardClasses.push(`kg-width-${payload.cardWidth}`);
        }
        if (payload.caption) {
            cardClasses.push(`kg-card-hascaption`);
        }

        const emailTemplateMaxWidth = 600;
        const aspectRatio = (payload.width || 0) / (payload.height || 1);
        const emailSpacerWidth = Math.round(emailTemplateMaxWidth / 4);
        const emailSpacerHeight = Math.round(emailTemplateMaxWidth / aspectRatio);

        const payloadData = Object.assign({alignment: 'left', loop: false}, payload);
        const templateData = {
            payload: payloadData,
            postUrl: options.postUrl,
            cardClasses: cardClasses.join(' '),
            thumbnailSrc: payloadData.customThumbnailSrc || payloadData.thumbnailSrc || '',
            posterSpacerSrc: `https://img.spacergif.org/v1/${payload.width}x${payload.height}/0a/spacer.png`,
            emailSpacerSrc: `https://img.spacergif.org/v1/${emailSpacerWidth}x${emailSpacerHeight}/0a/spacer.png`,
            emailTemplateMaxWidth,
            outlookCircleLeft: Math.round((emailTemplateMaxWidth / 2) - 39),
            outlookCircleTop: Math.round((emailSpacerHeight / 2) - 39),
            outlookPlayLeft: Math.round((emailTemplateMaxWidth / 2) - 11),
            outlookPlayTop: Math.round((emailSpacerHeight / 2) - 17)
        };

        const renderTemplate = options.target === 'email' ? emailTemplate : frontendTemplate;
        const html = dedent(renderTemplate(templateData));

        return dom.createRawHTMLSection(html);
    },

    absoluteToRelative(payload, options) {
        const p = payload as VideoPayload;
        p.src = p.src && absoluteToRelative(p.src, options.siteUrl, options);
        p.thumbnailSrc = p.thumbnailSrc && absoluteToRelative(p.thumbnailSrc, options.siteUrl, options);
        p.customThumbnailSrc = p.customThumbnailSrc && absoluteToRelative(p.customThumbnailSrc, options.siteUrl, options);
        p.caption = p.caption && htmlAbsoluteToRelative(p.caption, options.siteUrl, options);
        return payload;
    },

    relativeToAbsolute(payload, options) {
        const p = payload as VideoPayload;
        p.src = p.src && relativeToAbsolute(p.src, options.siteUrl, options.itemUrl ?? '', options);
        p.thumbnailSrc = p.thumbnailSrc && relativeToAbsolute(p.thumbnailSrc, options.siteUrl, options.itemUrl ?? '', options);
        p.customThumbnailSrc = p.customThumbnailSrc && relativeToAbsolute(p.customThumbnailSrc, options.siteUrl, options.itemUrl ?? '', options);
        p.caption = p.caption && htmlRelativeToAbsolute(p.caption, options.siteUrl, options.itemUrl ?? '', options);
        return payload;
    },

    toTransformReady(payload, options) {
        const p = payload as VideoPayload;
        p.src = p.src && toTransformReady(p.src, options.siteUrl, options.itemUrl ?? '', options);
        p.thumbnailSrc = p.thumbnailSrc && toTransformReady(p.thumbnailSrc, options.siteUrl, options.itemUrl ?? '', options);
        p.customThumbnailSrc = p.customThumbnailSrc && toTransformReady(p.customThumbnailSrc, options.siteUrl, options.itemUrl ?? '', options);
        p.caption = p.caption && htmlToTransformReady(p.caption, options.siteUrl, options.itemUrl ?? '', options);
        return payload;
    }
};

export default videoCard;
