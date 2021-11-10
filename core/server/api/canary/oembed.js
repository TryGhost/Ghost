const config = require('../../../shared/config');
const externalRequest = require('../../lib/request-external');

const OEmbed = require('../../services/oembed');
const oembed = new OEmbed({config, externalRequest});
const NFT = require('../../services/nft-oembed');
const nft = new NFT();
oembed.registerProvider(nft);

module.exports = {
    docName: 'oembed',

    read: {
        permissions: false,
        data: [
            'url',
            'type'
        ],
        options: [],
        query({data}) {
            let {url, type} = data;

            return oembed.fetchOembedDataFromUrl(url, type);
        }
    }
};
