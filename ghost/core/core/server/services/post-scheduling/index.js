const events = require('../../lib/common/events');
const PostSchedulerService = require('./post-scheduler-service');
const {sequence} = require('@tryghost/promise');

/**
 * @description Load all scheduled posts/pages from database.
 * @return {Promise}
 */
const loadScheduledResources = async function () {
    const api = require('../../api').endpoints;
    const SCHEDULED_RESOURCES = ['post', 'page'];

    // Fetches all scheduled resources(posts/pages) with default API
    const results = await sequence(SCHEDULED_RESOURCES.map(resourceType => async () => {
        const result = await api.schedules.getScheduled.query({
            options: {
                resource: resourceType
            }
        });

        return result[resourceType] || [];
    }));

    return SCHEDULED_RESOURCES.reduce(function (obj, entry, index) {
        return Object.assign(obj, {
            [entry]: results[index]
        });
    }, {});
};

const init = async ({adapter, apiUrl, integration}) => {
    let scheduledResources;

    if (!adapter.rescheduleOnBoot) {
        scheduledResources = [];
    } else {
        scheduledResources = await loadScheduledResources();
    }

    return new PostSchedulerService({
        apiUrl,
        integration,
        adapter,
        scheduledResources,
        events
    });
};

exports.init = init;
