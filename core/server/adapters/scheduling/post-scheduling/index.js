const Promise = require('bluebird'),
    moment = require('moment'),
    jwt = require('jsonwebtoken'),
    localUtils = require('../utils'),
    common = require('../../../lib/common'),
    models = require('../../../models'),
    urlUtils = require('../../../lib/url-utils'),
    _private = {};

 
/**
 * @description Load the internal scheduler integration
 *
 * @return {Promise}
 */
_private.getSchedulerIntegration = function() {
    return models.Integration.findOne({slug: 'ghost-scheduler'}, {withRelated: 'api_keys'})
        .then((integration) => {
            if (!integration) {
                throw new common.errors.NotFoundError({
                    message: common.i18n.t('errors.api.resource.resourceNotFound', {
                        resource: 'Integration'
                    })
                });
            }
            let apiKeys = integration.toJSON().api_keys;
            return integration.toJSON();
        });
};


/**
 * @description Get signed admin token for making authenticated requests
 *
 * @return {Promise}
 */
_private.getSignedAdminToken = function (options) {
    const {model, apiUrl, integration} = options;
    let key = integration.api_keys[0];

    const JWT_OPTIONS = {
        keyid: key.id,
        algorithm: 'HS256',
        audience: apiUrl
    };

    // Default token expiry is till 10 minutes after scheduled time
    // or if published_at is in past then till 10 minutes after blog start
    let tokenExpiry = moment(model.get('published_at')).add(10, 'm');
    if (tokenExpiry.isBefore(moment())) {
        tokenExpiry = moment().add(10, 'm');
    }

    return jwt.sign(
        {
            exp: tokenExpiry.unix(),
            nbf: moment(model.get('published_at')).subtract(5, 'm').unix()
        },
        Buffer.from(key.secret, 'hex'),
        JWT_OPTIONS
    );
}

/**
 * @description Normalize model data into scheduler notation.
 * @param {Object} options
 * @return {Object}
 */
_private.normalize = function normalize(options) {
    const {model, apiUrl, resourceType} = options;
    const resource = `${resourceType}s`
    const signedAdminToken = _private.getSignedAdminToken(options);
    let url = `${urlUtils.urlJoin(apiUrl, 'schedules', resource, model.get('id'))}/?token=${signedAdminToken}`;
    return {
        // NOTE: The scheduler expects a unix timestamp.
        time: moment(model.get('published_at')).valueOf(),
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
    const apiv2 = require('../../../api').v2;
    const resources = ['post', 'page'];
    return Promise.mapSeries(resources, (resourceType) => {
        return apiv2.schedules.getScheduled.query({
            options: {
                context: {internal: true},
                resource: resourceType
            }
        }).then((result) => {
            return result[resourceType];
        });
    }).then((results) => {
        return resources.reduce(function (obj, entry, index) {
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
        return Promise.reject(new common.errors.IncorrectUsageError({message: 'post-scheduling: no config was provided'}));
    }

    if (!apiUrl) {
        return Promise.reject(new common.errors.IncorrectUsageError({message: 'post-scheduling: no apiUrl was provided'}));
    }

    return _private.getSchedulerIntegration()
        .then((_integration) => {
            integration = _integration;
            return localUtils.createAdapter(options);
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
            Object.keys(scheduledResources).forEach((resourceType) => {
                scheduledResources[resourceType].forEach((model) => {
                    // NOTE: We are using reschedule, because custom scheduling adapter could use a database, which needs to be updated
                    //       and not an in-process implementation!
                    adapter.reschedule(_private.normalize({model, apiUrl, integration, resourceType}), {bootstrap: true});
                });
            });
        })
        .then(() => {
            adapter.run();
        })
        .then(() => {
            common.events.on('post.scheduled', (model) => {
                adapter.schedule(_private.normalize({model, apiUrl, integration, resourceType: 'post'}));
            });

            common.events.on('page.scheduled', (model) => {
                adapter.schedule(_private.normalize({model, apiUrl, integration, resourceType: 'page'}));
            });

            common.events.on('post.rescheduled', (model) => {
                adapter.reschedule(_private.normalize({model, apiUrl, integration, resourceType: 'post'}));
            });

            common.events.on('page.rescheduled', (model) => {
                adapter.reschedule(_private.normalize({model, apiUrl, integration, resourceType: 'page'}));
            });

            common.events.on('post.unscheduled', (model) => {
                adapter.unschedule(_private.normalize({model, apiUrl, integration, resourceType: 'post'}));
            });

            common.events.on('page.unscheduled', (model) => {
                adapter.unschedule(_private.normalize({model, apiUrl, integration, resourceType: 'page'}));
            });
        });
};
