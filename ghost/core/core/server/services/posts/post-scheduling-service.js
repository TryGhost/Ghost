const _ = require('lodash');
const errors = require('@tryghost/errors');
const moment = require('moment');
const config = require('../../../shared/config');
const urlUtils = require('../../../shared/url-utils');
const api = require('../../api').endpoints;

const messages = {
    jobNotFound: 'Job not found.',
    jobPublishInThePast: 'Use the force flag to publish a post in the past.'
};

class PostSchedulingService {
    /**
     * Publishes scheduled resource (a post or a page at the moment of writing)
     *
     * @param {String} resourceType one of 'post' or 'page' resources
     * @param {String} id resource id
     * @param {Boolean} force force publish flag
     * @param {Object} options api query options
     * @returns {Promise<Object, Object>}
     */
    async publish(resourceType, id, force, options) {
        const publishAPostBySchedulerToleranceInMinutes = config.get('times').publishAPostBySchedulerToleranceInMinutes;

        const result = await api[resourceType].read({id}, options);
        const preScheduledResource = result[resourceType][0];

        const publishedAtMoment = moment(preScheduledResource.published_at);

        if (publishedAtMoment.diff(moment(), 'minutes') > publishAPostBySchedulerToleranceInMinutes) {
            return Promise.reject(new errors.NotFoundError({message: messages.jobNotFound}));
        }

        if (publishedAtMoment.diff(moment(), 'minutes') < publishAPostBySchedulerToleranceInMinutes * -1 && force !== true) {
            return Promise.reject(new errors.NotFoundError({message: messages.jobPublishInThePast}));
        }

        const editedResource = {};
        editedResource[resourceType] = [{
            status: 'published',
            updated_at: moment(preScheduledResource.updated_at).toISOString(true)
        }];

        const editResult = await api[resourceType].edit(
            editedResource,
            _.pick(options, ['context', 'id', 'transacting', 'forUpdate'])
        );
        const scheduledResource = editResult[resourceType][0];

        return {scheduledResource, preScheduledResource};
    }

    /**
     *
     * @param {Object} scheduledResource post or page resource object
     * @param {Object} preScheduledResource post or page resource object in state before publishing
     * @returns {boolean|{value: string}}
     */
    handleCacheInvalidation(scheduledResource, preScheduledResource) {
        if (
            (scheduledResource.status === 'published' && preScheduledResource.status !== 'published') ||
            (scheduledResource.status === 'draft' && preScheduledResource.status === 'published')
        ) {
            return true;
        } else if (
            (scheduledResource.status === 'draft' && preScheduledResource.status !== 'published') ||
            (scheduledResource.status === 'scheduled' && preScheduledResource.status !== 'scheduled')
        ) {
            return {
                value: urlUtils.urlFor({
                    relativeUrl: urlUtils.urlJoin('/p', scheduledResource.uuid, '/')
                })
            };
        } else {
            return false;
        }
    }
}

/**
 * @returns {PostSchedulingService} instance of the PostsService
 */
const getPostSchedulingServiceInstance = () => {
    return new PostSchedulingService();
};

module.exports = getPostSchedulingServiceInstance;
