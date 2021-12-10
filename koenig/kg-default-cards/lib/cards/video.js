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
    name: 'video',
    type: 'dom',

    render({payload, env: {dom}, options = {}}) {
        if (!payload.src) {
            return dom.createTextNode('');
        }

        const frontendTemplate = hbs`
            <figure class="{{cardClasses}}">
                <video src="{{payload.src}}" poster="{{posterSpacerSrc}}" width="{{payload.width}}" height="{{payload.height}}"{{#if payload.loop}} loop{{/if}} controls preload="metadata" style="background: transparent url('{{thumbnailSrc}}') 50% 50% / cover no-repeat;" /></video>

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

        let cardClasses = ['kg-card kg-video-card'];
        if (payload.cardWidth) {
            cardClasses.push(`kg-width-${payload.cardWidth}`);
        }
        if (payload.caption) {
            cardClasses.push(`kg-card-hascaption`);
        }

        const emailTemplateMaxWidth = 600;
        const aspectRatio = payload.width / payload.height;
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
        payload.src = payload.src && absoluteToRelative(payload.src, options.siteUrl, options);
        payload.thumbnailSrc = payload.thumbnailSrc && absoluteToRelative(payload.thumbnailSrc, options.siteUrl, options);
        payload.customThumbnailSrc = payload.customThumbnailSrc && absoluteToRelative(payload.customThumbnailSrc, options.siteUrl, options);
        payload.caption = payload.caption && htmlAbsoluteToRelative(payload.caption, options.siteUrl, options);
        return payload;
    },

    relativeToAbsolute(payload, options) {
        payload.src = payload.src && relativeToAbsolute(payload.src, options.siteUrl, options.itemUrl, options);
        payload.thumbnailSrc = payload.thumbnailSrc && relativeToAbsolute(payload.thumbnailSrc, options.siteUrl, options.itemUrl, options);
        payload.customThumbnailSrc = payload.customThumbnailSrc && relativeToAbsolute(payload.customThumbnailSrc, options.siteUrl, options.itemUrl, options);
        payload.caption = payload.caption && htmlRelativeToAbsolute(payload.caption, options.siteUrl, options.itemUrl, options);
        return payload;
    },

    toTransformReady(payload, options) {
        payload.src = payload.src && toTransformReady(payload.src, options.siteUrl, options.itemUrl, options);
        payload.thumbnailSrc = payload.thumbnailSrc && toTransformReady(payload.thumbnailSrc, options.siteUrl, options.itemUrl, options);
        payload.customThumbnailSrc = payload.customThumbnailSrc && toTransformReady(payload.customThumbnailSrc, options.siteUrl, options.itemUrl, options);
        payload.caption = payload.caption && htmlToTransformReady(payload.caption, options.siteUrl, options.itemUrl, options);
        return payload;
    }
};
