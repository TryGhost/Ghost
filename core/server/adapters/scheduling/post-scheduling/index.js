const Promise = require('bluebird');
const moment = require('moment');
const localUtils = require('../utils');
const events = require('../../../lib/common/events');
const errors = require('@tryghost/errors');
const urlUtils = require('../../../../shared/url-utils');
const getSignedAdminToken = require('./scheduling-auth-token');
const getSchedulerIntegration = require('./scheduler-intergation');

const _private = {};
const SCHEDULED_RESOURCES = ['post', 'page'];

/**
 * @description Normalize model data into scheduler notation.
 * @param {Object} options
 * @return {Object}
 */
_private.normalize = function normalize({model, apiUrl, resourceType, integration}, event = '') {
    const resource = `${resourceType}s`;
    let publishedAt = (event === 'unscheduled') ? model.previous('published_at') : model.get('published_at');
    const signedAdminToken = getSignedAdminToken({publishedAt, apiUrl, integration});
    let url = `${urlUtils.urlJoin(apiUrl, 'schedules', resource, model.get('id'))}/?token=${signedAdminToken}`;
    return {
        // NOTE: The scheduler expects a unix timestamp.
        time: moment(publishedAt).valueOf(),
        url: url,
        extra: {
            httpMethod: 'PUT',
            oldTime: model.previous('published_at') ? moment(model.previous('published_at')).valueOf() : null
        }
    };
};

/**
 * @description Load all scheduled posts/pages from database.
 * @return {Promise}
 */
_private.loadScheduledResources = async function () {
    const api = require('../../../api');
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

/**
 * @description Initialise post scheduling.
 * @param {Object} options
 * @return {*}
 */
exports.init = async function init(options = {}) {
    const {apiUrl} = options;
    let adapter = null;
    let integration = null;

    if (!Object.keys(options).length) {
        return Promise.reject(new errors.IncorrectUsageError({message: 'post-scheduling: no config was provided'}));
    }

    if (!apiUrl) {
        return Promise.reject(new errors.IncorrectUsageError({message: 'post-scheduling: no apiUrl was provided'}));
    }

    integration = await getSchedulerIntegration();
    adapter = await localUtils.createAdapter();

    let scheduledResources;

    if (!adapter.rescheduleOnBoot) {
        scheduledResources = [];
    } else {
        scheduledResources = await _private.loadScheduledResources();
    }

    if (Object.keys(scheduledResources).length) {
        // Reschedules all scheduled resources on boot
        // NOTE: We are using reschedule, because custom scheduling adapter could use a database, which needs to be updated
        // and not an in-process implementation!
        Object.keys(scheduledResources).forEach((resourceType) => {
            scheduledResources[resourceType].forEach((model) => {
                adapter.unschedule(_private.normalize({model, apiUrl, integration, resourceType}, 'unscheduled'), {bootstrap: true});
                adapter.schedule(_private.normalize({model, apiUrl, integration, resourceType}));
            });
        });
    }

    adapter.run();

    SCHEDULED_RESOURCES.forEach((resource) => {
        events.on(`${resource}.scheduled`, (model) => {
            adapter.schedule(_private.normalize({model, apiUrl, integration, resourceType: resource}));
        });

        /** We want to do reschedule as (unschedule + schedule) due to how token(+url) is generated
         * We want to first remove existing schedule by generating a matching token(+url)
         * followed by generating a new token(+url) for the new schedule
        */
        events.on(`${resource}.rescheduled`, (model) => {
            adapter.unschedule(_private.normalize({model, apiUrl, integration, resourceType: resource}, 'unscheduled'));
            adapter.schedule(_private.normalize({model, apiUrl, integration, resourceType: resource}));
        });

        events.on(`${resource}.unscheduled`, (model) => {
            adapter.unschedule(_private.normalize({model, apiUrl, integration, resourceType: resource}, 'unscheduled'));
        });
    });
};
