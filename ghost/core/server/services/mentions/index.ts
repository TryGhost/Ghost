import { defineService, legacyEvent } from '../../../../bootstrap/transition/define-service';
import { recommendationSourceUrl } from '../recommendations/recommendation-url';

// A post or page whose links may have changed: mentions are sent for what it links to.
const SENDS_MENTIONS = [
  'post.published',
  'post.published.edited',
  'post.unpublished',
  'page.published',
  'page.published.edited',
  'page.unpublished',
];

export default defineService('Mentions', {
  create: () => {
    const MentionController = require('./mention-controller');
    const WebmentionMetadata = require('./webmention-metadata');
    const MentionsAPI = require('./mentions-api');
    const MentionSendingService = require('./mention-sending-service');
    const MentionDiscoveryService = require('./mention-discovery-service');
    const BookshelfMentionRepository = require('./bookshelf-mention-repository');
    const ResourceService = require('./resource-service');
    const RoutingService = require('./routing-service');
    const { createPostUrlHelpers } = require('./post-urls');
    const DomainEvents = require('@tryghost/domain-events');
    const logging = require('@tryghost/logging');
    const models = require('../../models');
    const externalRequest = require('../../lib/request-external.js');
    const { forPost } = require('../../api/endpoints/utils/serializers/output/utils/url');
    const urlUtils = require('../../../shared/url-utils').default;
    const settingsCache = require('../../../shared/settings-cache');
    const urlService = require('../url');
    const oembedService = require('../oembed');
    const jobsService = require('../jobs-service').getInstance();

    const repository = new BookshelfMentionRepository({
      MentionModel: models.Mention,
      DomainEvents,
      logging,
    });
    const metadata = new WebmentionMetadata({ oembedService });
    const discoveryService = new MentionDiscoveryService({ externalRequest, logging });
    const resourceService = new ResourceService({ urlUtils, urlService });
    const routingService = new RoutingService({
      siteUrl: new URL(urlUtils.getSiteUrl()),
      resourceService,
      externalRequest,
      logging,
    });
    const api = new MentionsAPI({
      repository,
      webmentionMetadata: metadata,
      resourceService,
      routingService,
      logging,
    });

    const controller = new MentionController({
      logging,
      api,
      jobsService,
      mentionResourceService: {
        async getByID(id: { toHexString(): string } | null) {
          if (!id) {
            return null;
          }
          const post = await models.Post.findOne({ id: id.toHexString() });

          if (!post) {
            return null;
          }
          return {
            id,
            name: post.get('title'),
            type: post.get('type'),
          };
        },
      },
    });

    const { getPostData, getPostUrl } = createPostUrlHelpers({ urlService, forPost });
    const sendingService = new MentionSendingService({
      discoveryService,
      externalRequest,
      getSiteUrl: () => urlUtils.urlFor('home', true),
      getPostData,
      getPostUrl,
      isEnabled: () => !settingsCache.get('is_private'),
      jobsService,
      logging,
    });
    // Recommendations are announced as mentions of a URL with a suffix. The mapping is added here
    // and not by Recommendations, as metadata can be asked for before that service is built.
    // It is the one thing a service still contributes to another by being built; it moves when a
    // definition can declare what it contributes.
    metadata.addMapper(recommendationSourceUrl);

    return { api, repository, controller, metadata, sendingService };
  },
  listeners: SENDS_MENTIONS.map((name) => ({
    event: legacyEvent(name),
    handle: (
      { sendingService }: { sendingService: { sendForPost(...event: unknown[]): unknown } },
      ...event: unknown[]
    ) => sendingService.sendForPost(...event),
  })),
});
