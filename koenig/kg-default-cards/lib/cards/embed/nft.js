module.exports = {
    render({payload, env: {dom}, options = {}}) {
        const figure = dom.createElement('figure');
        figure.setAttribute('class', 'kg-card kg-embed-card kg-nft-card');

        let html = `
            <a href="${payload.url}" class="kg-nft-card">
                <img class="kg-nft-image" src="${payload.metadata.image_url}">
                <div class="kg-nft-metadata">
                    <div class="kg-nft-header">
                        <h4 class="kg-nft-title"> ${payload.metadata.title} </h4>
                    </div>
                    <div class="kg-nft-creator">
                        Created by <span class="kg-nft-creator-name">${payload.metadata.author_name}</span>
                        ${(payload.metadata.collection_name ? `&bull; ${payload.metadata.collection_name}` : ``)}
                    </div>
                    ${(payload.metadata.description ? `<p class="kg-nft-description">${payload.metadata.description}</p>` : ``)}
                </div>
            </a>
        `;

        if (options.target === 'email') {
            html = `
            <table cellspacing="0" cellpadding="0" border="0" style="border: 1px solid #DDE1E5; border-radius: 5px; width: auto; margin: 0 auto;">
                <tr>
                    <td>
                        <a href="${payload.url}"><img src="${payload.metadata.image_url}" style="max-width: 512px; border: none; width: 100%;" border="0"></a>
                    </td>
                </tr>
                <tr>
                    <td>
                        <table cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                                <td><a href="${payload.url}" class="kg-nft-link" style="font-size: 17px !important; font-weight: 600; padding-top: 8px; padding-bottom: 4px;">${payload.metadata.title}</a></td>
                                <td align="right">
                                <a href="${payload.url}" class="kg-nft-link"></a>
                                </td>
                            </tr>
                            <tr>
                                <td colspan="2">
                                <a href="${payload.url}" class="kg-nft-link" style="padding-top: 0px; ${(!payload.metadata.description ? ` padding-bottom: 20px;` : ``)}"><span style="color: #ABB4BE;">Created by</span> <span style="color: #15171A; font-weight: 500;">${payload.metadata.author_name}</span> ${(payload.metadata.collection_name ? `<span style="color: #ABB4BE;">&bull; ${payload.metadata.collection_name}</span>` : ``)}</a>
                                </td>
                            </tr>
                            ${(payload.metadata.description ? `
                            <tr>
                                <td colspan="2">
                                <a href="${payload.url}" class="kg-nft-link" style="padding-bottom: 20px; max-width: 440px;">${payload.metadata.description}</a>
                                </td>
                            </tr>
                            ` : ``)}
                        </table>
                    </td>
                </tr>
            </table>
            `;
        }

        if (payload.caption) {
            let figcaption = dom.createElement('figcaption');
            figcaption.appendChild(dom.createRawHTMLSection(payload.caption));
            figure.appendChild(figcaption);
            figure.setAttribute('class', `${figure.getAttribute('class')} kg-card-hascaption`);
        }

        figure.appendChild(dom.createRawHTMLSection(html));

        return figure;
    }
};
