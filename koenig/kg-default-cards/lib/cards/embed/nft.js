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
                ${html}
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
