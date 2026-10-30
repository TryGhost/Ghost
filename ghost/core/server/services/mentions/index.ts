import { defineService } from '../../../kernel/define-service';

export default defineService('Mentions', async () => {
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
  const events = require('../../lib/common/events');
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

  const controller = new MentionController({ logging });
  await controller.init({
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
  // Listening is the last step, so nothing above it needs unwinding when
  // construction fails.
  sendingService.listen(events);

  return { api, repository, controller, metadata, sendingService };
});
