const {
    htmlAbsoluteToRelative,
    htmlRelativeToAbsolute
} = require('@tryghost/url-utils/lib/utils');

module.exports = {
    name: 'embed',
    type: 'dom',

    render({payload, env: {dom}, options = {}}) {
        if (!payload.html) {
            return dom.createTextNode('');
        }

        const figure = dom.createElement('figure');
        figure.setAttribute('class', 'kg-card kg-embed-card');

        const isVideoWithThumbnail = payload.type === 'video'
            && payload.metadata
            && payload.metadata.thumbnail_url;

        if (options.target === 'email' && isVideoWithThumbnail) {
            figure.setAttribute('class', 'kg-card kg-embed-card');

            const emailTemplateMaxWidth = 600;
            const thumbnailAspectRatio = payload.metadata.thumbnail_width / payload.metadata.thumbnail_height;
            const spacerWidth = Math.round(emailTemplateMaxWidth / 4);
            const spacerHeight = Math.round(emailTemplateMaxWidth / thumbnailAspectRatio);
            const html = `
                <!--[if !mso !vml]-->
                <a class="kg-video-preview" href="${payload.url}" aria-label="Play video" style="mso-hide: all">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" background="${payload.metadata.thumbnail_url}" role="presentation" style="background: url('${payload.metadata.thumbnail_url}') left top / cover; mso-hide: all">
                        <tr style="mso-hide: all">
                            <td width="25%" style="visibility: hidden; mso-hide: all">
                                <img src="https://img.spacergif.org/v1/${spacerWidth}x${spacerHeight}/0a/spacer.png" alt="" width="100%" border="0" style="height: auto; opacity: 0; visibility: hidden; mso-hide: all;">
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
                <v:group xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" coordsize="${emailTemplateMaxWidth},${spacerHeight}" coordorigin="0,0" href="${payload.url}" style="width:${emailTemplateMaxWidth}px;height:${spacerHeight}px;">
                    <v:rect fill="t" stroked="f" style="position:absolute;width:${emailTemplateMaxWidth};height:${spacerHeight};"><v:fill src="${payload.metadata.thumbnail_url}" type="frame"/></v:rect>
                    <v:oval fill="t" strokecolor="white" strokeweight="4px" style="position:absolute;left:${Math.round((emailTemplateMaxWidth / 2) - 39)};top:${Math.round((spacerHeight / 2) - 39)};width:78;height:78"><v:fill color="black" opacity="30%" /></v:oval>
                    <v:shape coordsize="24,32" path="m,l,32,24,16,xe" fillcolor="white" stroked="f" style="position:absolute;left:${Math.round((emailTemplateMaxWidth / 2) - 11)};top:${Math.round((spacerHeight / 2) - 17)};width:30;height:34;" />
                </v:group>
                <![endif]-->

            `;
            figure.appendChild(dom.createRawHTMLSection(html));
        } else {
            figure.appendChild(dom.createRawHTMLSection(payload.html));
        }

        if (payload.caption) {
            let figcaption = dom.createElement('figcaption');
            figcaption.appendChild(dom.createRawHTMLSection(payload.caption));
            figure.appendChild(figcaption);
            figure.setAttribute('class', `${figure.getAttribute('class')} kg-card-hascaption`);
        }

        return figure;
    },

    absoluteToRelative(payload, options) {
        payload.caption = payload.caption && htmlAbsoluteToRelative(payload.caption, options.siteUrl, options);
        return payload;
    },

    relativeToAbsolute(payload, options) {
        payload.caption = payload.caption && htmlRelativeToAbsolute(payload.caption, options.siteUrl, options.itemUrl, options);
        return payload;
    }
};
