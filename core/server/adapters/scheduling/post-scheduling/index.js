var Promise = require('bluebird'),
    moment = require('moment'),
    localUtils = require('../utils'),
    common = require('../../../lib/common'),
    models = require('../../../models'),
    schedules = require('../../../api/schedules'),
    urlService = require('../../../services/url'),
    _private = {};

_private.normalize = function normalize(options) {
    var object = options.object,
        apiUrl = options.apiUrl,
        client = options.client;

    return {
        time: moment(object.get('published_at')).valueOf(),
        url: urlService.utils.urlJoin(apiUrl, 'schedules', 'posts', object.get('id')) + '?client_id=' + client.get('slug') + '&client_secret=' + client.get('secret'),
        extra: {
            httpMethod: 'PUT',
            oldTime: object.updated('published_at') ? moment(object.updated('published_at')).valueOf() : null
        }
    };
};

_private.loadClient = function loadClient() {
    return models.Client.findOne({slug: 'ghost-scheduler'}, {columns: ['slug', 'secret']});
};

_private.loadScheduledPosts = function () {
    return schedules.getScheduledPosts()
        .then(function (result) {
            return result.posts || [];
        });
};

exports.init = function init(options) {
    var config = options || {},
        apiUrl = config.apiUrl,
        adapter = null,
        client = null;

    if (!config) {
        return Promise.reject(new common.errors.IncorrectUsageError({message: 'post-scheduling: no config was provided'}));
    }

    if (!apiUrl) {
        return Promise.reject(new common.errors.IncorrectUsageError({message: 'post-scheduling: no apiUrl was provided'}));
    }

    return _private.loadClient()
        .then(function (_client) {
            client = _client;
            return localUtils.createAdapter(config);
        })
        .then(function (_adapter) {
            adapter = _adapter;
            if (!adapter.rescheduleOnBoot) {
                return [];
            }
            return _private.loadScheduledPosts();
        })
        .then(function (scheduledPosts) {
            if (!scheduledPosts.length) {
                return;
            }

            scheduledPosts.forEach(function (object) {
                adapter.reschedule(_private.normalize({object: object, apiUrl: apiUrl, client: client}));
            });
        })
        .then(function () {
            adapter.run();
        })
        .then(function () {
            common.events.onMany([
                'post.scheduled',
                'page.scheduled'
            ], function (object) {
                adapter.schedule(_private.normalize({object: object, apiUrl: apiUrl, client: client}));
            });

            common.events.onMany([
                'post.rescheduled',
                'page.rescheduled'
            ], function (object) {
                adapter.reschedule(_private.normalize({object: object, apiUrl: apiUrl, client: client}));
            });

            common.events.onMany([
                'post.unscheduled',
                'page.unscheduled'
            ], function (object) {
                adapter.unschedule(_private.normalize({object: object, apiUrl: apiUrl, client: client}));
            });
        });
};
