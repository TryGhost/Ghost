const assert = require('node:assert/strict');
const NFTOEmbedProvider = require('../../../../../core/server/services/oembed/nft-oembed-provider');

describe('NFTOEmbedProvider', function () {
    it('Can support requests for OpenSea Ethereum NTFs', async function () {
        const provider = new NFTOEmbedProvider({
            config: {
                apiKey: 'fake-api-key'
            }
        });

        const ethereumNFTURL = new URL(
            'https://opensea.io/assets/ethereum/0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb/9998'
        );

        const supportsRequest = await provider.canSupportRequest(ethereumNFTURL);

        assert(supportsRequest, 'Should support ethereum NFT URL');
    });
});
