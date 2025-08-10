const config = require('../../../shared/config');
const storage = require('../../adapters/storage');
const externalRequest = require('../../lib/request-external');

const OEmbedService = require('./OEmbedService');
const oembed = new OEmbedService({config, externalRequest, storage});

const NFT = require('./NFTOEmbedProvider');
const nft = new NFT({
    config: {
        apiKey: config.get('opensea').privateReadOnlyApiKey
    }
});

const Twitter = require('./TwitterOEmbedProvider');
const twitter = new Twitter({
    config: {
        bearerToken: config.get('twitter').privateReadOnlyToken
    }
});

const Amazon = require('./AmazonOEmbedProvider');
const amazon = new Amazon({
    config: {}
});

oembed.registerProvider(nft);
oembed.registerProvider(twitter);
oembed.registerProvider(amazon);

module.exports = oembed;
