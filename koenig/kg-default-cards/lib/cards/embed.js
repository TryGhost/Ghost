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
                <a class="kg-video-preview" href="${payload.url}" aria-label="Play video">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" background="${payload.metadata.thumbnail_url}" role="presentation">
                        <tr>
                            <td width="25%">
                                <img src="https://placehold.it/${spacerWidth}x${spacerHeight}.gif?text=+" alt="" width="100%" border="0" style="height: auto; opacity: 0; visibility: hidden;">
                            </td>
                            <td width="50%" align="center" valign="middle" style="vertical-align: middle">
                                <div class="kg-video-play-button"><div>&nbsp;</div></div>
                            </td>
                            <td width="25%">&nbsp;</td>
                        </tr>
                    </table>
                </a>
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
