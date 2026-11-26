import { defineService } from '../../../kernel/define-service';

// Needs the adapter manager, which boot sets up in initCore. Boot initializes
// this root before Mentions and Recommendations, which read the ready instance
// while they initialize. Provider credentials and the images adapter are
// captured here, once; image upload settings are still read on each operation.
// Construction acquires nothing that needs releasing, so a failed attempt
// leaves nothing behind.
export default defineService('oEmbed', () => {
  const OEmbedService = require('./oembed-service');
  const NFTOEmbedProvider = require('./nft-oembed-provider');
  const TwitterOEmbedProvider = require('./twitter-oembed-provider');
  const config = require('../../../shared/config');
  const logging = require('@tryghost/logging');
  const imageTransform = require('@tryghost/image-transform');
  const adapterManager = require('../adapter-manager').default;
  const externalRequest = require('../../lib/request-external');

  const imageStore = adapterManager.getAdapter('storage:images');
  const oembed = new OEmbedService({
    config,
    externalRequest,
    imageStore,
    imageTransform,
    logging,
  });

  const nft = new NFTOEmbedProvider({
    config: {
      apiKey: config.get('opensea').privateReadOnlyApiKey,
    },
  });
  const twitter = new TwitterOEmbedProvider({
    config: {
      bearerToken: config.get('twitter').privateReadOnlyToken,
    },
    logging,
  });

  oembed.registerProvider(nft);
  oembed.registerProvider(twitter);

  return oembed;
});
