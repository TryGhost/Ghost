const config = require('../../../shared/config');
const storage = require('../../adapters/storage');
const externalRequest = require('../../lib/request-external');
const {Rettiwt} = require('rettiwt-api');

const OEmbed = require('@tryghost/oembed-service');
const oembed = new OEmbed({config, externalRequest, storage});

const NFT = require('./NFTOEmbedProvider');
const nft = new NFT({
    config: {
        apiKey: config.get('opensea').privateReadOnlyApiKey
    }
});

const Twitter = require('./RettiwtOEmbedProvider');
const fetcher = new Rettiwt();
const twitter = new Twitter({
    externalRequest: fetcher
});

oembed.registerProvider(nft);
oembed.registerProvider(twitter);

module.exports = oembed;
