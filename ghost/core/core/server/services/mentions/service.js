const MentionController = require('./MentionController');
const WebmentionMetadata = require('./WebmentionMetadata');
const {
    MentionsAPI,
    MentionSendingService,
    MentionDiscoveryService
} = require('@tryghost/webmentions');
const BookshelfMentionRepository = require('./BookshelfMentionRepository');
const ResourceService = require('./ResourceService');
const RoutingService = require('./RoutingService');
const models = require('../../models');
const events = require('../../lib/common/events');
const externalRequest = require('../../../server/lib/request-external.js');
const urlUtils = require('../../../shared/url-utils');
const outputSerializerUrlUtil = require('../../../server/api/endpoints/utils/serializers/output/utils/url');
const urlService = require('../url');
const settingsCache = require('../../../shared/settings-cache');
const DomainEvents = require('@tryghost/domain-events');
const jobsService = require('../mentions-jobs');

function getPostUrl(post) {
    const jsonModel = {};
    outputSerializerUrlUtil.forPost(post.id, jsonModel, {options: {}});
    return jsonModel.url;
}

module.exports = {
    /** @type {import('@tryghost/webmentions/lib/MentionsAPI')} */
    api: null,
    /** @type {import('./BookshelfMentionRepository')} */
    repository: null,
    controller: new MentionController(),
    metadata: new WebmentionMetadata(),
    /** @type {import('@tryghost/webmentions/lib/MentionSendingService')} */
    sendingService: null,
    didInit: false,
    async init() {
        if (this.didInit) {
            return;
        }
        this.didInit = true;
        const repository = new BookshelfMentionRepository({
            MentionModel: models.Mention,
            DomainEvents
        });
        this.repository = repository;

        const webmentionMetadata = this.metadata;
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
            webmentionMetadata,
            resourceService,
            routingService
        });

        this.api = api;

        this.controller.init({
            api,
            jobService: {
                async addJob(name, fn) {
                    jobsService.addJob({
                        name,
                        job: fn,
                        offloaded: false
                    });
                }
            },
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
            jobService: {
                async addJob(name, fn) {
                    jobsService.addJob({
                        name,
                        job: fn,
                        offloaded: false
                    });
                }
            }
        });
        sendingService.listen(events);

        this.sendingService = sendingService;
    }
};
