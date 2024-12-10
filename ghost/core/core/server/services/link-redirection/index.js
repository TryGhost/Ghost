const urlUtils = require('../../../shared/url-utils');
const LinkRedirectRepository = require('./LinkRedirectRepository');
const adapterManager = require('../adapter-manager');
const config = require('../../../shared/config');
const EventRegistry = require('../../lib/common/events');
const JobManager = require('../jobs');
const path = require('path');
const settingsCache = require('../../../shared/settings-cache');

class LinkRedirectsServiceWrapper {
    async init() {
        if (this.service) {
            // Already done
            return;
        }

        // Wire up all the dependencies
        const models = require('../../models');

        const {LinkRedirectsService} = require('@tryghost/link-redirects');

        this.linkRedirectRepository = new LinkRedirectRepository({
            LinkRedirect: models.Redirect,
            urlUtils,
            cacheAdapter: config.get('hostSettings:linkRedirectsPublicCache:enabled') ? adapterManager.getAdapter('cache:linkRedirectsPublic') : null,
            EventRegistry
        });

        // Expose the service
        this.service = new LinkRedirectsService({
            linkRedirectRepository: this.linkRedirectRepository,
            urlConfig: {
                baseURL: new URL(urlUtils.getSiteUrl())
            },
            submitHandleRedirectJob,
            config
        });
    }
}

const submitHandleRedirectJob = async ({uuid, linkId, timestamp}) => {
    console.log(`Submitting redirect job to queue for ${uuid} with linkId ${linkId} and timestamp ${timestamp}`);
    await JobManager.addQueuedJob({
        name: `link-redirect-event-${uuid}-${linkId}-${timestamp}`,
        metadata: {
            job: path.resolve(__dirname, path.join('jobs', 'link-redirect-event')),
            name: 'link-redirect-event',
            data: {
                uuid,
                linkId,
                timestamp,
                timezone: settingsCache.get('timezone') || 'Etc/UTC'
            }
        }
    });
};

module.exports = new LinkRedirectsServiceWrapper();
