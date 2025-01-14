const config = require('../../../shared/config');
const storage = require('../../adapters/storage');
const externalRequest = require('../../lib/request-external');
// const {FetcherService, EResourceType} = require('rettiwt-api');
const {Rettiwt} = require('rettiwt-api');
const {XEmbedProvider} = require('@tryghost/x-embed-provider');
const OEmbed = require('@tryghost/oembed-service');
const oembed = new OEmbed({config, externalRequest, storage});

const NFT = require('./NFTOEmbedProvider');
const nft = new NFT({
    config: {
        apiKey: config.get('opensea').privateReadOnlyApiKey
    }
});

// const Twitter = require('./TwitterOEmbedProvider');
// const twitter = new Twitter({
//     config: {
//         bearerToken: config.get('twitter').privateReadOnlyToken
//     }
// });

const rettiwt = new Rettiwt({apiKey: config.get('twitter').privateReadOnlyToken || ''});

// Wrapping FetcherService to conform to the expected dependency structure
const twitter = new XEmbedProvider({
    _fetcher: async (tweetId) => {
        const response = await rettiwt.tweet.details(tweetId);
        return response;
    }
});

oembed.registerProvider(nft);
oembed.registerProvider(twitter);

module.exports = oembed;
