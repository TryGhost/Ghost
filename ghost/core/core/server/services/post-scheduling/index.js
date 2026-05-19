const events = require('../../lib/common/events');
const PostSchedulerService = require('./post-scheduler-service');
const {sequence} = require('@tryghost/promise');

const SCHEDULED_RESOURCES = ['post', 'page'];

/**
 * @description Load all scheduled posts/pages from database.
 * @return {Promise}
 */
const loadScheduledResources = async function () {
    const api = require('../../api').endpoints;
    const results = await sequence(SCHEDULED_RESOURCES.map(resourceType => async () => {
        const result = await api.schedules.getScheduled.query({options: {resource: resourceType}});
        return result[resourceType] || [];
    }));
    return SCHEDULED_RESOURCES.reduce((obj, entry, index) => Object.assign(obj, {[entry]: results[index]}), {});
};

const init = async ({adapter, apiUrl, internalKeys}) => {
    const service = new PostSchedulerService({apiUrl, internalKeys, adapter, events});
    if (adapter.rescheduleOnBoot) {
        const scheduledResources = await loadScheduledResources();
        await service.reschedule(scheduledResources);
    }
    return service;
};

exports.init = init;
