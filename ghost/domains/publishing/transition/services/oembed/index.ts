import { defineService } from '@tryghost/kernel/define-service';

/**
 * What callers use of the oEmbed service. The implementation is JavaScript, so
 * its shape is written out here.
 */
export interface OEmbedService {
  /** Describes the page at a URL as oEmbed data, falling back to bookmark metadata. */
  fetchOembedDataFromUrl(
    url: string,
    type?: string,
    options?: Record<string, unknown>,
  ): Promise<Record<string, unknown> | undefined>;
  /** Fetches a page and decodes it to text. */
  fetchPageHtml(
    url: string,
    options?: Record<string, unknown>,
  ): Promise<{ url: string; body: string; contentType: string | undefined }>;
  processImageFromUrl(imageUrl: string, imageType: string): Promise<string>;
  registerProvider(provider: object): void;
}

// Boot initializes this root after the adapter manager and before Mentions,
// which hands the ready instance to its metadata service. The images adapter
// and the provider credentials are read once, here, as they always have been.
export default defineService('OEmbed', (): OEmbedService => {
  const config = require('../../../../../core/shared/config');
  const adapterManager = require('../../../../../core/server/services/adapter-manager').default;
  const externalRequest = require('../../../../../core/server/lib/request-external');
  const logging = require('@tryghost/logging');
  const imageTransform = require('@tryghost/image-transform');
  const OEmbedServiceClass = require('./oembed-service');
  const NFT = require('./nft-oembed-provider');
  const Twitter = require('./twitter-oembed-provider');

  const imageStore = adapterManager.getAdapter('storage:images');
  const oembed = new OEmbedServiceClass({
    config,
    externalRequest,
    imageStore,
    logging,
    imageTransform,
  });

  const nft = new NFT({
    config: {
      apiKey: config.get('opensea').privateReadOnlyApiKey,
    },
  });
  const twitter = new Twitter({
    config: {
      bearerToken: config.get('twitter').privateReadOnlyToken,
    },
    logging,
  });

  // NFT is asked before Twitter.
  oembed.registerProvider(nft);
  oembed.registerProvider(twitter);

  return oembed;
});
