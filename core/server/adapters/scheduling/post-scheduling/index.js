const Promise = require('bluebird');
const moment = require('moment');
const localUtils = require('../utils');
const events = require('../../../lib/common/events');
const i18n = require('../../../../shared/i18n');
const errors = require('@tryghost/errors');
const models = require('../../../models');
const urlUtils = require('../../../../shared/url-utils');
const getSignedAdminToken = require('./scheduling-auth-token');
const _private = {};
const SCHEDULED_RESOURCES = ['post', 'page'];

/**
 * @description Load the internal scheduler integration
 *
 * @return {Promise}
 */
_private.getSchedulerIntegration = function () {
    return models.Integration.findOne({slug: 'ghost-scheduler'}, {withRelated: 'api_keys'})
        .then((integration) => {
            if (!integration) {
                throw new errors.NotFoundError({
                    message: i18n.t('errors.api.resource.resourceNotFound', {
                        resource: 'Integration'
                    })
                });
            }
            return integration.toJSON();
        });
};

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
_private.loadScheduledResources = function () {
    const api = require('../../../api');
    // Fetches all scheduled resources(posts/pages) with default API
    return Promise.mapSeries(SCHEDULED_RESOURCES, (resourceType) => {
        return api.schedules.getScheduled.query({
            options: {
                resource: resourceType
            }
        }).then((result) => {
            return result[resourceType] || [];
        });
    }).then((results) => {
        return SCHEDULED_RESOURCES.reduce(function (obj, entry, index) {
            return Object.assign(obj, {
                [entry]: results[index]
            });
        }, {});
    });
};

/**
 * @description Initialise post scheduling.
 * @param {Object} options
 * @return {*}
 */
exports.init = function init(options = {}) {
    const {apiUrl} = options;
    let adapter = null;
    let integration = null;

    if (!Object.keys(options).length) {
        return Promise.reject(new errors.IncorrectUsageError({message: 'post-scheduling: no config was provided'}));
    }

    if (!apiUrl) {
        return Promise.reject(new errors.IncorrectUsageError({message: 'post-scheduling: no apiUrl was provided'}));
    }

    return _private.getSchedulerIntegration()
        .then((_integration) => {
            integration = _integration;
            return localUtils.createAdapter();
        })
        .then((_adapter) => {
            adapter = _adapter;

            if (!adapter.rescheduleOnBoot) {
                return [];
            }

            return _private.loadScheduledResources();
        })
        .then((scheduledResources) => {
            if (!Object.keys(scheduledResources).length) {
                return;
            }

            // Reschedules all scheduled resources on boot
            // NOTE: We are using reschedule, because custom scheduling adapter could use a database, which needs to be updated
            // and not an in-process implementation!
            Object.keys(scheduledResources).forEach((resourceType) => {
                scheduledResources[resourceType].forEach((model) => {
                    adapter.unschedule(_private.normalize({model, apiUrl, integration, resourceType}, 'unscheduled'), {bootstrap: true});
                    adapter.schedule(_private.normalize({model, apiUrl, integration, resourceType}));
                });
            });
        })
        .then(() => {
            adapter.run();
        })
        .then(() => {
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
        });
};
