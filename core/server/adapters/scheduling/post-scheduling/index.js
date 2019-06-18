const Promise = require('bluebird'),
    moment = require('moment'),
    localUtils = require('../utils'),
    common = require('../../../lib/common'),
    models = require('../../../models'),
    urlUtils = require('../../../lib/url-utils'),
    _private = {};

/**
 * @description Normalize model data into scheduler notation.
 * @param {Object} options
 * @return {Object}
 */
_private.normalize = function normalize(options) {
    const {model, apiUrl, client} = options;

    return {
        // NOTE: The scheduler expects a unix timestmap.
        time: moment(model.get('published_at')).valueOf(),
        // @TODO: We are still using API v0.1
        url: `${urlUtils.urlJoin(apiUrl, 'schedules', 'posts', model.get('id'))}?client_id=${client.get('slug')}&client_secret=${client.get('secret')}`,
        extra: {
            httpMethod: 'PUT',
            oldTime: model.previous('published_at') ? moment(model.previous('published_at')).valueOf() : null
        }
    };
};

/**
 * @description Load the client credentials for v0.1 API.
 *
 * @TODO: Remove when we drop v0.1. API v2 uses integrations.
 * @return {Promise}
 */
_private.loadClient = function loadClient() {
    return models.Client.findOne({slug: 'ghost-scheduler'}, {columns: ['slug', 'secret']});
};

/**
 * @description Load all scheduled posts from database.
 * @return {Promise}
 */
_private.loadScheduledPosts = function () {
    const api = require('../../../api');
    return api.schedules.getScheduledPosts()
        .then((result) => {
            return result.posts || [];
        });
};

/**
 * @description Initialise post scheduling.
 * @param {Object} options
 * @return {*}
 */
exports.init = function init(options = {}) {
    const {apiUrl} = options;
    let adapter = null,
        client = null;

    if (!Object.keys(options).length) {
        return Promise.reject(new common.errors.IncorrectUsageError({message: 'post-scheduling: no config was provided'}));
    }

    if (!apiUrl) {
        return Promise.reject(new common.errors.IncorrectUsageError({message: 'post-scheduling: no apiUrl was provided'}));
    }

    return _private.loadClient()
        .then((_client) => {
            client = _client;
            return localUtils.createAdapter(options);
        })
        .then((_adapter) => {
            adapter = _adapter;

            if (!adapter.rescheduleOnBoot) {
                return [];
            }

            return _private.loadScheduledPosts();
        })
        .then((scheduledPosts) => {
            if (!scheduledPosts.length) {
                return;
            }

            scheduledPosts.forEach((model) => {
                // NOTE: We are using reschedule, because custom scheduling adapter could use a database, which needs to be updated
                //       and not an in-process implementation!
                adapter.reschedule(_private.normalize({model, apiUrl, client}), {bootstrap: true});
            });
        })
        .then(() => {
            adapter.run();
        })
        .then(() => {
            common.events.onMany([
                'post.scheduled',
                'page.scheduled'
            ], (model) => {
                adapter.schedule(_private.normalize({model, apiUrl, client}));
            });

            common.events.onMany([
                'post.rescheduled',
                'page.rescheduled'
            ], (model) => {
                adapter.reschedule(_private.normalize({model, apiUrl, client}));
            });

            common.events.onMany([
                'post.unscheduled',
                'page.unscheduled'
            ], (model) => {
                adapter.unschedule(_private.normalize({model, apiUrl, client}));
            });
        });
};
