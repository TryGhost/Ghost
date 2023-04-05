import {addCreateDocumentOption} from '../../utils/add-create-document-option';

// const nftCard = require('./types/nft');
// const twitterCard = require('./types/twitter');

export function renderEmbedNodeToDOM(node, options = {}) {
    addCreateDocumentOption(options);

    const document = options.createDocument();
    const embedType = node.getEmbedType();
    // const metadata = node.getMetadata();

    if (!node.getHtml() && embedType !== 'nft') {
        return document.createTextNode('');
    }

    // if (embedType === 'twitter') {
    //     return twitterCard.render(node, document, options);
    // }

    // if (metadata && embedType === 'nft') {
    //     return nftCard.render(node, document, options);
    // }

    return renderTemplate(node, document, options);
}

function renderTemplate(node, document, options) {
    const isEmail = options.target === 'email';
    const metadata = node.getMetadata();
    const url = node.getUrl();
    const isVideoWithThumbnail = node.getType() === 'video' && metadata && metadata.thumbnail_url;

    const figure = document.createElement('figure');
    figure.setAttribute('class', 'kg-card kg-embed-card');
    const container = document.createElement('div');

    if (isEmail && isVideoWithThumbnail) {
        const emailTemplateMaxWidth = 600;
        const thumbnailAspectRatio = metadata.thumbnail_width / metadata.thumbnail_height;
        const spacerWidth = Math.round(emailTemplateMaxWidth / 4);
        const spacerHeight = Math.round(emailTemplateMaxWidth / thumbnailAspectRatio);
        const html = `
            <!--[if !mso !vml]-->
            <a class="kg-video-preview" href="${url}" aria-label="Play video" style="mso-hide: all">
                <table cellpadding="0" cellspacing="0" border="0" width="100%" background="${metadata.thumbnail_url}" role="presentation" style="background: url('${metadata.thumbnail_url}') left top / cover; mso-hide: all">
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
            <v:group xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" coordsize="${emailTemplateMaxWidth},${spacerHeight}" coordorigin="0,0" href="${url}" style="width:${emailTemplateMaxWidth}px;height:${spacerHeight}px;">
                <v:rect fill="t" stroked="f" style="position:absolute;width:${emailTemplateMaxWidth};height:${spacerHeight};"><v:fill src="${metadata.thumbnail_url}" type="frame"/></v:rect>
                <v:oval fill="t" strokecolor="white" strokeweight="4px" style="position:absolute;left:${Math.round((emailTemplateMaxWidth / 2) - 39)};top:${Math.round((spacerHeight / 2) - 39)};width:78;height:78"><v:fill color="black" opacity="30%" /></v:oval>
                <v:shape coordsize="24,32" path="m,l,32,24,16,xe" fillcolor="white" stroked="f" style="position:absolute;left:${Math.round((emailTemplateMaxWidth / 2) - 11)};top:${Math.round((spacerHeight / 2) - 17)};width:30;height:34;" />
            </v:group>
            <![endif]-->
        `;
        container.innerHTML = html.trim();
        figure.appendChild(container);
    } else {
        container.innerHTML = node.getHtml();
        figure.appendChild(container);
    }
    
    const caption = node.getCaption();
    if (caption) {
        const figcaption = document.createElement('figcaption');
        figcaption.textContent = caption;
        figure.appendChild(figcaption);
        figure.setAttribute('class', `${figure.getAttribute('class')} kg-card-hascaption`);
    }

    return figure;
}
