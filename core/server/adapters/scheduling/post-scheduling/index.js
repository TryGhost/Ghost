const Promise = require('bluebird');
const moment = require('moment');
const jwt = require('jsonwebtoken');
const localUtils = require('../utils');
const {i18n, events} = require('../../../lib/common');
const errors = require('@tryghost/errors');
const models = require('../../../models');
const urlUtils = require('../../../../shared/url-utils');
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
 * @description Get signed admin token for making authenticated scheduling requests
 *
 * @return {Promise}
 */
_private.getSignedAdminToken = function ({publishedAt, apiUrl, integration}) {
    let key = integration.api_keys[0];

    const JWT_OPTIONS = {
        keyid: key.id,
        algorithm: 'HS256',
        audience: apiUrl,
        noTimestamp: true
    };

    // Default token expiry is till 6 hours after scheduled time
    // or if published_at is in past then till 6 hours after blog start
    // to allow for retries in case of network issues
    // and never before 10 mins to publish time
    let tokenExpiry = moment(publishedAt).add(6, 'h');
    if (tokenExpiry.isBefore(moment())) {
        tokenExpiry = moment().add(6, 'h');
    }

    return jwt.sign(
        {
            exp: tokenExpiry.unix(),
            nbf: moment(publishedAt).subtract(10, 'm').unix()
        },
        Buffer.from(key.secret, 'hex'),
        JWT_OPTIONS
    );
};

/**
 * @description Normalize model data into scheduler notation.
 * @param {Object} options
 * @return {Object}
 */
_private.normalize = function normalize({model, apiUrl, resourceType, integration}, event = '') {
    const resource = `${resourceType}s`;
    let publishedAt = (event === 'unscheduled') ? model.previous('published_at') : model.get('published_at');
    const signedAdminToken = _private.getSignedAdminToken({publishedAt, apiUrl, integration});
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
