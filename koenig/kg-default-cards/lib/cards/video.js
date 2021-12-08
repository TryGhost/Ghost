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
                <video src="{{payload.src}}" poster="{{payload.thumbnailSrc}}" width="{{payload.width}}" height="{{payload.height}}" loop="{{payload.loop}}" controls preload="metadata" /></video>

                {{#if payload.caption}}
                    <figcaption>{{{payload.caption}}}</figcaption>
                {{/if}}
            </figure>
        `;

        const emailTemplateMaxWidth = 600;
        const thumbnailAspectRatio = payload.thumbailWidth / payload.thumbnailHeight;
        const spacerWidth = Math.round(emailTemplateMaxWidth / 4);
        const spacerHeight = Math.round(emailTemplateMaxWidth / thumbnailAspectRatio);

        const emailTemplate = hbs`
            <figure class="{{cardClasses}}">
                <!--[if !mso !vml]-->
                <a class="kg-video-preview" href="{{payload.src}}" aria-label="Play video" style="mso-hide: all">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" background="{{payload.thumbnailSrc}}" role="presentation" style="background: url('{{payload.thumbnailSrc}}') left top / cover; mso-hide: all">
                        <tr style="mso-hide: all">
                            <td width="25%" style="visibility: hidden; mso-hide: all">
                                <img src="https://img.spacergif.org/v1/{{spacerWidth}}x{{spacerHeight}}/0a/spacer.png" alt="" width="100%" border="0" style="height: auto; opacity: 0; visibility: hidden; mso-hide: all;">
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
                <v:group xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" coordsize="{{emailTemplateMaxWidth}},{{spacerHeight}}" coordorigin="0,0" href="{{payload.src}}" style="width:{{emailTemplateMaxWidth}}px;height:{{spacerHeight}}px;">
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

        const payloadData = Object.assign({alignment: 'left', loop: false}, payload);
        const templateData = {
            payload: payloadData,
            cardClasses: cardClasses.join(' '),
            emailTemplateMaxWidth,
            spacerWidth,
            spacerHeight,
            outlookCircleLeft: Math.round((emailTemplateMaxWidth / 2) - 39),
            outlookCircleTop: Math.round((spacerHeight / 2) - 39),
            outlookPlayLeft: Math.round((emailTemplateMaxWidth / 2) - 11),
            outlookPlayTop: Math.round((spacerHeight / 2) - 17)
        };

        const renderTemplate = options.target === 'email' ? emailTemplate : frontendTemplate;
        const html = dedent(renderTemplate(templateData));

        return dom.createRawHTMLSection(html);
    },

    absoluteToRelative(payload, options) {
        payload.src = payload.src && absoluteToRelative(payload.src, options.siteUrl, options);
        payload.thumbnailSrc = payload.thumbnailSrc && absoluteToRelative(payload.thumbnailSrc, options.siteUrl, options);
        payload.caption = payload.caption && htmlAbsoluteToRelative(payload.caption, options.siteUrl, options);
        return payload;
    },

    relativeToAbsolute(payload, options) {
        payload.src = payload.src && relativeToAbsolute(payload.src, options.siteUrl, options.itemUrl, options);
        payload.thumbnailSrc = payload.thumbnailSrc && relativeToAbsolute(payload.thumbnailSrc, options.siteUrl, options.itemUrl, options);
        payload.caption = payload.caption && htmlRelativeToAbsolute(payload.caption, options.siteUrl, options.itemUrl, options);
        return payload;
    },

    toTransformReady(payload, options) {
        payload.src = payload.src && toTransformReady(payload.src, options.siteUrl, options.itemUrl, options);
        payload.thumbnailSrc = payload.thumbnailSrc && toTransformReady(payload.thumbnailSrc, options.siteUrl, options.itemUrl, options);
        payload.caption = payload.caption && htmlToTransformReady(payload.caption, options.siteUrl, options.itemUrl, options);
        return payload;
    }
};
