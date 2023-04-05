// TODO: this has escapeHTML wrappers around each metadata prop... do we need this?
// TODO: what do we do about the encodeURIComponent for the payload?

module.exports = {
    render(node, document, options) {
        const metadata = node.getMetadata();
        const url = node.getUrl();

        const figure = document.createElement('figure');
        figure.setAttribute('class', 'kg-card kg-embed-card kg-nft-card');

        const container = document.createElement('div');

        let html = `
            <a class="kg-nft-card-container" href="${url}" data-payload="${encodeURIComponent(JSON.stringify(metadata))}">
                <div class="kg-ntf-image-container"><img class="kg-nft-image" src="${metadata.image_url}"></div>
                <div class="kg-nft-metadata">
                    <div class="kg-nft-header">
                        <h4 class="kg-nft-title"> ${metadata.title} </h4>
                        <img src="https://static.ghost.org/v4.0.0/images/opensea-logo.png" class="kg-nft-opensea-logo">
                    </div>
                    <div class="kg-nft-creator">
                        Created by <span class="kg-nft-creator-name">${metadata.author_name}</span>
                        ${(metadata.collection_name ? `&bull; ${metadata.collection_name}` : ``)}
                    </div>
                    ${(metadata.description ? `<p class="kg-nft-description">${metadata.description}</p>` : ``)}
                </div>
            </a>
        `;

        if (options.target === 'email') {
            html = `
            <table cellspacing="0" cellpadding="0" border="0" style="border: 1px solid #DDE1E5; border-radius: 5px; width: auto; margin: 0 auto;">
                <tr>
                    <td align="center">
                        <a href="${url}"><img src="${metadata.image_url}" style="max-width: 512px; border: none; width: 100%;" border="0"></a>
                    </td>
                </tr>
                <tr>
                    <td>
                        <table cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                                <td valign="top"><a href="${url}" class="kg-nft-link" style="font-size: 17px !important; font-weight: 600; padding-top: 8px; max-width: 300px;">${metadata.title}</a></td>
                                <td align="right" valign="top">
                                <a href="${url}" class="kg-nft-link" style="padding-top: 6px; padding-bottom: 0px;"><img src="https://static.ghost.org/v4.0.0/images/opensea-logo.png" width="100" border="0"></a>
                                </td>
                            </tr>
                            <tr>
                                <td colspan="2">
                                <a href="${url}" class="kg-nft-link" style="padding-top: 0px; ${(!metadata.description ? ` padding-bottom: 20px;` : ``)}"><span style="color: #ABB4BE;">Created by</span> <span style="color: #15171A; font-weight: 500;">${metadata.author_name}</span> ${(metadata.collection_name ? `<span style="color: #ABB4BE;">&bull; ${metadata.collection_name}</span>` : ``)}</a>
                                </td>
                            </tr>
                            ${(metadata.description ? `
                            <tr>
                                <td colspan="2">
                                <a href="${url}" class="kg-nft-link" style="padding-bottom: 20px; max-width: 440px;">${metadata.description}</a>
                                </td>
                            </tr>
                            ` : ``)}
                        </table>
                    </td>
                </tr>
            </table>
            `;
        }

        container.innerHTML = html.trim();
        figure.appendChild(container);

        const caption = node.getCaption();
        if (caption) {
            const figcaption = document.createElement('figcaption');
            figcaption.textContent = caption;
            figure.appendChild(figcaption);
            figure.setAttribute('class', `${figure.getAttribute('class')} kg-card-hascaption`);
        }

        return figure;
    }
};