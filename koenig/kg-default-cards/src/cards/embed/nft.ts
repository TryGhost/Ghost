import {escapeHtml} from '@tryghost/string';
import type {CardRenderArgs, CardRenderOptions, SimpleDomNode} from '../../types.js';

const nftCard = {
    render({payload, env: {dom}, options = {}}: CardRenderArgs): SimpleDomNode {
        const figure = dom.createElement('figure');
        figure.setAttribute('class', 'kg-card kg-embed-card kg-nft-card');

        const metadata = payload.metadata as Record<string, string>;

        let html = `
            <a class="kg-nft-card-container" href="${escapeHtml(payload.url as string)}" data-payload="${encodeURIComponent(JSON.stringify(payload))}">
                <div class="kg-ntf-image-container"><img class="kg-nft-image" src="${escapeHtml(metadata.image_url)}"></div>
                <div class="kg-nft-metadata">
                    <div class="kg-nft-header">
                        <h4 class="kg-nft-title"> ${escapeHtml(metadata.title)} </h4>
                        <img src="https://static.ghost.org/v4.0.0/images/opensea-logo.png" class="kg-nft-opensea-logo">
                    </div>
                    <div class="kg-nft-creator">
                        Created by <span class="kg-nft-creator-name">${escapeHtml(metadata.author_name)}</span>
                        ${(metadata.collection_name ? `&bull; ${escapeHtml(metadata.collection_name)}` : ``)}
                    </div>
                    ${(metadata.description ? `<p class="kg-nft-description">${escapeHtml(metadata.description)}</p>` : ``)}
                </div>
            </a>
        `;

        if ((options as CardRenderOptions).target === 'email') {
            html = `
            <table cellspacing="0" cellpadding="0" border="0" style="border: 1px solid #DDE1E5; border-radius: 5px; width: auto; margin: 0 auto;">
                <tr>
                    <td align="center">
                        <a href="${escapeHtml(payload.url as string)}"><img src="${escapeHtml(metadata.image_url)}" style="max-width: 512px; border: none; width: 100%;" border="0"></a>
                    </td>
                </tr>
                <tr>
                    <td>
                        <table cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                                <td valign="top"><a href="${escapeHtml(payload.url as string)}" class="kg-nft-link" style="font-size: 17px !important; font-weight: 600; padding-top: 8px; max-width: 300px;">${escapeHtml(metadata.title)}</a></td>
                                <td align="right" valign="top">
                                <a href="${escapeHtml(payload.url as string)}" class="kg-nft-link" style="padding-top: 6px; padding-bottom: 0px;"><img src="https://static.ghost.org/v4.0.0/images/opensea-logo.png" width="100" border="0"></a>
                                </td>
                            </tr>
                            <tr>
                                <td colspan="2">
                                <a href="${escapeHtml(payload.url as string)}" class="kg-nft-link" style="padding-top: 0px; ${(!metadata.description ? ` padding-bottom: 20px;` : ``)}"><span style="color: #ABB4BE;">Created by</span> <span style="color: #15171A; font-weight: 500;">${escapeHtml(metadata.author_name)}</span> ${(metadata.collection_name ? `<span style="color: #ABB4BE;">&bull; ${escapeHtml(metadata.collection_name)}</span>` : ``)}</a>
                                </td>
                            </tr>
                            ${(metadata.description ? `
                            <tr>
                                <td colspan="2">
                                <a href="${escapeHtml(payload.url as string)}" class="kg-nft-link" style="padding-bottom: 20px; max-width: 440px;">${escapeHtml(metadata.description)}</a>
                                </td>
                            </tr>
                            ` : ``)}
                        </table>
                    </td>
                </tr>
            </table>
            `;
        }

        figure.appendChild(dom.createRawHTMLSection(html));

        if (payload.caption) {
            const figcaption = dom.createElement('figcaption');
            figcaption.appendChild(dom.createRawHTMLSection(payload.caption as string));
            figure.appendChild(figcaption);
            figure.setAttribute('class', `${figure.getAttribute('class')} kg-card-hascaption`);
        }

        return figure;
    }
};

export default nftCard;
