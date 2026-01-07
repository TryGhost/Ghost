const config = require('../../../shared/config');
const storage = require('../../adapters/storage');
const externalRequest = require('../../lib/request-external');

const OEmbedService = require('./o-embed-service');
const oembed = new OEmbedService({config, externalRequest, storage});

const NFT = require('./nfto-embed-provider');
const nft = new NFT({
    config: {
        apiKey: config.get('opensea').privateReadOnlyApiKey
    }
});

const Twitter = require('./twitter-o-embed-provider');
const twitter = new Twitter({
    config: {
        bearerToken: config.get('twitter').privateReadOnlyToken
    }
});

oembed.registerProvider(nft);
oembed.registerProvider(twitter);

module.exports = oembed;
