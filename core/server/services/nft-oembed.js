/**
 * @typedef {import('./oembed').ICustomProvider} ICustomProvider
 * @typedef {import('./oembed').IExternalRequest} IExternalRequest
 */

const OPENSEA_PATH_REGEX = /^\/assets\/(0x[a-f0-9]+)\/(\d+)/;

/**
 * @implements ICustomProvider
 */
class NFTOEmbedProvider {
    /**
     * @param {object} dependencies
     */
    constructor(dependencies) {
        this.dependencies = dependencies;
    }

    /**
     * @param {URL} url
     * @returns {Promise<boolean>}
     */
    async canSupportRequest(url) {
        return url.host === 'opensea.io' && OPENSEA_PATH_REGEX.test(url.pathname);
    }

    /**
     * @param {URL} url
     * @param {IExternalRequest} externalRequest
     *
     * @returns {Promise<import('oembed-parser').RichTypeData & Object<string, any>>}
     */
    async getOEmbedData(url, externalRequest) {
        const [match, transaction, asset] = url.pathname.match(OPENSEA_PATH_REGEX);
        if (!match) {
            return null;
        }
        const result = await externalRequest(`https://api.opensea.io/api/v1/asset/${transaction}/${asset}/`, {
            json: true
        });
        return {
            version: '1.0',
            type: 'rich',
            title: result.body.name,
            author_name: result.body.creator.user.username,
            author_url: `https://opensea.io/${result.body.creator.user.username}`,
            provider_name: 'OpenSea',
            provider_url: 'https://opensea.io',
            html: `
            <a href="${result.body.permalink}" class="kg-nft-card">
                <img class="kg-nft-image" src="${result.body.image_url}">
                <div class="kg-nft-metadata">
                    <div class="kg-nft-header">
                        <h4 class="kg-nft-title"> ${result.body.name} </h4>
                    </div>
                    <div class="kg-nft-creator">
                        Created by <span class="kg-nft-creator-name">${result.body.creator.user.username}</span>
                        ${(result.body.collection.name ? `&bull; ${result.body.collection.name}` : ``)}
                    </div>
                    ${(result.body.description ? `<p class="kg-nft-description">${result.body.description}</p>` : ``)}
                </div>
            </a>
            `,
            width: 1000,
            height: 1000,
            noIframe: true
        };
    }
}

module.exports = NFTOEmbedProvider;
