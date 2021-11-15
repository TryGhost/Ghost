module.exports = {
    render({payload, env: {dom}}) {
        const figure = dom.createElement('figure');
        figure.setAttribute('class', 'kg-card kg-embed-card kg-nft-card');

        const html = `
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

        figure.appendChild(dom.createRawHTMLSection(html));

        return figure;
    }
};
