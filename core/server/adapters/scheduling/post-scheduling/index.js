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
        // NOTE: The scheduler expects a unix timestamp.
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
    // TODO: make this version aware?
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
    // @TODO Fix scheduler to work without v0.1
    return Promise.resolve();
};
