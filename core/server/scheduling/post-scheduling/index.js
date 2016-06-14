var Promise = require('bluebird'),
    moment = require('moment'),
    utils = require(__dirname + '/../utils'),
    events = require(__dirname + '/../../events'),
    errors = require(__dirname + '/../../errors'),
    models = require(__dirname + '/../../models'),
    schedules = require(__dirname + '/../../api/schedules'),
    _private = {};

_private.normalize = function normalize(options) {
    var object = options.object,
        apiUrl = options.apiUrl,
        client = options.client;

    return {
        time: moment(object.get('published_at')).valueOf(),
        url: apiUrl + '/schedules/posts/' + object.get('id') + '?client_id=' + client.get('slug') + '&client_secret=' + client.get('secret'),
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
    return schedules.getScheduledPosts({
        from: moment().subtract(7, 'days').startOf('day').toDate(),
        to: moment().endOf('day').toDate()
    }).then(function (result) {
        return result.posts || [];
    });
};

exports.init = function init(options) {
    var config = options || {},
        apiUrl = config.apiUrl,
        adapter = null,
        client = null;

    if (!config) {
        return Promise.reject(new errors.IncorrectUsage('post-scheduling: no config was provided'));
    }

    if (!apiUrl) {
        return Promise.reject(new errors.IncorrectUsage('post-scheduling: no apiUrl was provided'));
    }

    return _private.loadClient()
        .then(function (_client) {
            client = _client;

            return utils.createAdapter(config);
        })
        .then(function (_adapter) {
            adapter = _adapter;

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
            events.onMany([
                'post.scheduled',
                'page.scheduled'
            ], function (object) {
                adapter.schedule(_private.normalize({object: object, apiUrl: apiUrl, client: client}));
            });

            events.onMany([
                'post.rescheduled',
                'page.rescheduled'
            ], function (object) {
                adapter.reschedule(_private.normalize({object: object, apiUrl: apiUrl, client: client}));
            });

            events.onMany([
                'post.unscheduled',
                'page.unscheduled'
            ], function (object) {
                adapter.unschedule(_private.normalize({object: object, apiUrl: apiUrl, client: client}));
            });
        });
};
