const Promise = require('bluebird');
const events = require('../../../lib/common/events');
const localUtils = require('../utils');
const PostScheduler = require('./post-scheduler');
const getSchedulerIntegration = require('./scheduler-intergation');

/**
 * @description Load all scheduled posts/pages from database.
 * @return {Promise}
 */
const loadScheduledResources = async function () {
    const api = require('../../../api');
    const SCHEDULED_RESOURCES = ['post', 'page'];

    // Fetches all scheduled resources(posts/pages) with default API
    const results = await Promise.mapSeries(SCHEDULED_RESOURCES, async (resourceType) => {
        const result = await api.schedules.getScheduled.query({
            options: {
                resource: resourceType
            }
        });

        return result[resourceType] || [];
    });

    return SCHEDULED_RESOURCES.reduce(function (obj, entry, index) {
        return Object.assign(obj, {
            [entry]: results[index]
        });
    }, {});
};

const init = async (options) => {
    const integration = await getSchedulerIntegration();
    const adapter = await localUtils.createAdapter();

    let scheduledResources;

    if (!adapter.rescheduleOnBoot) {
        scheduledResources = [];
    } else {
        scheduledResources = await loadScheduledResources();
    }

    return new PostScheduler({
        apiUrl: options.apiUrl,
        integration,
        adapter,
        scheduledResources,
        events
    });
};

module.exports = init;
