const config = require('../../../shared/config');
const storage = require('../../adapters/storage');
const externalRequest = require('../../lib/request-external');
const {Rettiwt} = require('rettiwt-api');

const OEmbedService = require('./OEmbedService');
const oembed = new OEmbedService({config, externalRequest, storage});

const NFT = require('./NFTOEmbedProvider');
const nft = new NFT({
    config: {
        apiKey: config.get('opensea').privateReadOnlyApiKey
    }
});

//#TODO Clean up

// const Twitter = require('./TwitterOEmbedProvider');
// const twitter = new Twitter({
//     config: {
//         bearerToken: config.get('twitter').privateReadOnlyToken
//     }
// });

const X = require('./XEmbedProvider');
const rettiwt = new Rettiwt();
const twitter = new X({
    _fetchTweetEntity: async (tweetId) => {
        const response = await rettiwt.tweet.details(tweetId);
        return response;
    }
});

oembed.registerProvider(nft);
oembed.registerProvider(twitter);

module.exports = oembed;
