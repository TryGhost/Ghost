const ObjectID = require('bson-objectid').default;
const MentionController = require('./MentionController');
const WebmentionMetadata = require('./WebmentionMetadata');
const mail = require('../mail');
const {
    MentionsAPI,
    MentionSendingService,
    MentionDiscoveryService,
    MentionCreatedEvent,
    MentionNotifications
} = require('@tryghost/webmentions');
// const MentionNotifications = require('./MentionNotifications');
const BookshelfMentionRepository = require('./BookshelfMentionRepository');
const models = require('../../models');
const events = require('../../lib/common/events');
const externalRequest = require('../../../server/lib/request-external.js');
const urlUtils = require('../../../shared/url-utils');
const outputSerializerUrlUtil = require('../../../server/api/endpoints/utils/serializers/output/utils/url');
const labs = require('../../../shared/labs');
const urlService = require('../url');
const settingsCache = require('../../../shared/settings-cache');
const settingsHelpers = require('../settings-helpers');
const logging = require('@tryghost/logging');
const DomainEvents = require('@tryghost/domain-events');
const ghostMailer = new mail.GhostMailer();
const siteDomain = urlUtils.urlFor('home', true);
const mailer = ghostMailer;

function getPostUrl(post) {
    const jsonModel = {};
    outputSerializerUrlUtil.forPost(post.id, jsonModel, {options: {}});
    return jsonModel.url;
}

const mentionNotifications = new MentionNotifications({
    logging,
    models,
    settingsCache,
    urlUtils,
    siteDomain,
    settingsHelpers,
    mailer
});

module.exports = {
    controller: new MentionController(),
    async init() {
        const repository = new BookshelfMentionRepository({
            MentionModel: models.Mention
        });
        const webmentionMetadata = new WebmentionMetadata();
        const discoveryService = new MentionDiscoveryService({externalRequest});
        const api = new MentionsAPI({
            repository,
            webmentionMetadata,
            resourceService: {
                async getByURL(url) {
                    const path = urlUtils.absoluteToRelative(url.href, {withoutSubdirectory: true});
                    const resource = urlService.getResource(path);
                    if (resource?.config?.type === 'posts') {
                        return {
                            type: 'post',
                            id: ObjectID.createFromHexString(resource.data.id)
                        };
                    }
                    return {
                        type: null,
                        id: null
                    };
                }
            },
            routingService: {
                async pageExists(url) {
                    const siteUrl = new URL(urlUtils.getSiteUrl());
                    if (siteUrl.origin !== url.origin) {
                        return false;
                    }
                    const subdir = urlUtils.getSubdir();
                    if (subdir && !url.pathname.startsWith(subdir)) {
                        return false;
                    }

                    return true;
                }
            }
        });

        this.controller.init({api});

        const sendingService = new MentionSendingService({
            discoveryService,
            externalRequest,
            getSiteUrl: () => urlUtils.urlFor('home', true),
            getPostUrl: post => getPostUrl(post),
            isEnabled: () => labs.isSet('webmentions')
        });
        sendingService.listen(events);

        function MentionNotificationListener() {
            DomainEvents.subscribe(MentionCreatedEvent, async (event) => {
                await mentionNotifications.notifyMentionReceived(event.data.data);
            });
        }
        if (labs.isSet('webmentions')) {
            MentionNotificationListener();
        }
    }
};
