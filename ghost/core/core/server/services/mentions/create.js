const MentionController = require('./mention-controller');
const WebmentionMetadata = require('./webmention-metadata');
const MentionsAPI = require('./mentions-api');
const MentionSendingService = require('./mention-sending-service');
const MentionDiscoveryService = require('./mention-discovery-service');
const BookshelfMentionRepository = require('./bookshelf-mention-repository');
const ResourceService = require('./resource-service');
const RoutingService = require('./routing-service');
const externalRequest = require('../../lib/request-external.js');
const outputSerializerUrlUtil = require('../../api/endpoints/utils/serializers/output/utils/url');

function getPostUrl(post) {
    const jsonModel = post.toJSON();
    outputSerializerUrlUtil.forPost(post.id, jsonModel, {options: {}});
    return jsonModel.url;
}

/**
 * @param {object} deps
 * @param {object} deps.models
 * @param {object} deps.events
 * @param {object} deps.domainEvents
 * @param {object} deps.urlUtils
 * @param {object} deps.settingsCache
 * @param {object} deps.urlService
 * @param {object} deps.jobsService
 */
module.exports = function createMentionsService({models, events, domainEvents, urlUtils, settingsCache, urlService, jobsService}) {
    const repository = new BookshelfMentionRepository({
        MentionModel: models.Mention,
        DomainEvents: domainEvents
    });

    const metadata = new WebmentionMetadata();
    const discoveryService = new MentionDiscoveryService({externalRequest});
    const resourceService = new ResourceService({
        urlUtils,
        urlService
    });

    const routingService = new RoutingService({
        siteUrl: new URL(urlUtils.getSiteUrl()),
        resourceService,
        externalRequest
    });

    const api = new MentionsAPI({
        repository,
        webmentionMetadata: metadata,
        resourceService,
        routingService
    });

    const jobService = {
        async addJob(name, fn) {
            jobsService.addJob({
                name,
                job: fn,
                offloaded: false
            });
        }
    };

    const controller = new MentionController();
    controller.init({
        api,
        jobService,
        mentionResourceService: {
            async getByID(id) {
                if (!id) {
                    return null;
                }
                const post = await models.Post.findOne({id: id.toHexString()});

                if (!post) {
                    return null;
                }
                return {
                    id: id,
                    name: post.get('title'),
                    type: post.get('type')
                };
            }
        }
    });

    const sendingService = new MentionSendingService({
        discoveryService,
        externalRequest,
        getSiteUrl: () => urlUtils.urlFor('home', true),
        getPostUrl: post => getPostUrl(post),
        isEnabled: () => !settingsCache.get('is_private'),
        jobService
    });

    let initialized = false;

    return {
        api,
        repository,
        controller,
        metadata,
        sendingService,
        async init() {
            if (initialized) {
                return;
            }
            initialized = true;
            sendingService.listen(events);
        }
    };
};
