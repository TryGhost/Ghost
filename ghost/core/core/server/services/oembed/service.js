const config = require('../../../shared/config');
const storage = require('../../adapters/storage');
const externalRequest = require('../../lib/request-external');

const OEmbed = require('@tryghost/oembed-service');
const oembed = new OEmbed({config, externalRequest, storage});

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

oembed.registerProvider(nft);
oembed.registerProvider(twitter);

module.exports = oembed;
