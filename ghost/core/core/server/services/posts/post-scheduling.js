const _ = require('lodash');
const errors = require('@tryghost/errors');
const moment = require('moment');
const config = require('../../../shared/config');
const urlUtils = require('../../../shared/url-utils');
const api = require('../../api').endpoints;

const messages = {
    jobPublishInThePast: 'Use the force flag to publish a post in the past.'
};

// Returned when there is nothing to publish — the job fired ahead of its
// scheduled time (e.g. the post was rescheduled later but the scheduler still
// holds the original, earlier job), or the resource was deleted. Lets the
// caller respond 2xx so the scheduler treats the job as done rather than
// retrying a publish that will never happen.
const NO_OP = {scheduledResource: null, preScheduledResource: null};

/**
 * Publishes scheduled resource (a post or a page at the moment of writing)
 *
 * @param {string} resourceType one of 'post' or 'page' resources
 * @param {string} id resource id
 * @param {boolean} force force publish flag
 * @param {Object} options api query options
 * @returns {Promise<Object, Object>} the published resource, or a no-op with
 *   `scheduledResource: null` when there was nothing to publish yet
 */
exports.publish = async (resourceType, id, force, options) => {
    const publishAPostBySchedulerToleranceInMinutes = config.get('times').publishAPostBySchedulerToleranceInMinutes;

    let preScheduledResource;
    try {
        const result = await api[resourceType].read({id}, options);
        preScheduledResource = result[resourceType][0];
    } catch (err) {
        // Resource was deleted between scheduling and firing — nothing to
        // publish. (The permissions stage tolerates the same NotFound so the
        // request reaches here.)
        if (errors.utils.isGhostError(err) && err.errorType === 'NotFoundError') {
            return NO_OP;
        }

        throw err;
    }

    const publishedAtMoment = moment(preScheduledResource.published_at);

    if (publishedAtMoment.diff(moment(), 'minutes') > publishAPostBySchedulerToleranceInMinutes) {
        return NO_OP;
    }

    // Past the tolerance without a force flag is a genuinely dropped publish, so
    // keep it an error rather than silently skipping it.
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
};

/**
 * @param {Object} scheduledResource post or page resource object
 * @param {Object} preScheduledResource post or page resource object in state before publishing
 * @returns {boolean|{value: string}}
 */
exports.handleCacheInvalidation = (scheduledResource, preScheduledResource) => {
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
};
