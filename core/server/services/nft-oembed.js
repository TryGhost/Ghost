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
            html: '',
            width: 1000,
            height: 1000,
            card_type: 'nft',
            image_url: result.body.image_url,
            creator_name: result.body.creator.user.username,
            description: result.body.description
        };
    }
}

module.exports = NFTOEmbedProvider;
