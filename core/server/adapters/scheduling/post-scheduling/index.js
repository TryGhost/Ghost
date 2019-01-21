const Promise = require('bluebird'),
    moment = require('moment'),
    localUtils = require('../utils'),
    common = require('../../../lib/common'),
    models = require('../../../models'),
    urlService = require('../../../services/url'),
    _private = {};

_private.normalize = function normalize(options) {
    const {object, apiUrl, client} = options;

    return {
        time: moment(object.get('published_at')).valueOf(),
        url: `${urlService.utils.urlJoin(apiUrl, 'schedules', 'posts', object.get('id'))}?client_id=${client.get('slug')}&client_secret=${client.get('secret')}`,
        extra: {
            httpMethod: 'PUT',
            oldTime: object.previous('published_at') ? moment(object.previous('published_at')).valueOf() : null
        }
    };
};

_private.loadClient = function loadClient() {
    return models.Client.findOne({slug: 'ghost-scheduler'}, {columns: ['slug', 'secret']});
};

_private.loadScheduledPosts = function () {
    const api = require('../../../api');
    return api.schedules.getScheduledPosts()
        .then((result) => {
            return result.posts || [];
        });
};

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

            scheduledPosts.forEach((object) => {
                adapter.reschedule(_private.normalize({object, apiUrl, client}));
            });
        })
        .then(() => {
            adapter.run();
        })
        .then(() => {
            common.events.onMany([
                'post.scheduled',
                'page.scheduled'
            ], (object) => {
                adapter.schedule(_private.normalize({object, apiUrl, client}));
            });

            common.events.onMany([
                'post.rescheduled',
                'page.rescheduled'
            ], (object) => {
                adapter.reschedule(_private.normalize({object, apiUrl, client}));
            });

            common.events.onMany([
                'post.unscheduled',
                'page.unscheduled'
            ], (object) => {
                adapter.unschedule(_private.normalize({object, apiUrl, client}));
            });
        });
};
