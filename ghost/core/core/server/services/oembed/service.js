const config = require('../../../shared/config');
const adapterManager = require('../../services/adapter-manager').default;
const externalRequest = require('../../lib/request-external');

const OEmbedService = require('./oembed-service');

const imageStore = adapterManager.getAdapter('storage:images');
const oembed = new OEmbedService({config, externalRequest, imageStore});

const NFT = require('./nft-oembed-provider');
const nft = new NFT({
    config: {
        apiKey: config.get('opensea').privateReadOnlyApiKey
    }
});

const Twitter = require('./twitter-oembed-provider');
const twitter = new Twitter({
    config: {
        bearerToken: config.get('twitter').privateReadOnlyToken
    }
});

oembed.registerProvider(nft);
oembed.registerProvider(twitter);

module.exports = oembed;
