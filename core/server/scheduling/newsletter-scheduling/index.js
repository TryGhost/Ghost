var Promise = require('bluebird'),
    moment = require('moment'),
    _ = require('lodash'),
    config = require(__dirname + '/../../config'),
    events = require(config.paths.corePath + '/server/events'),
    errors = require(config.paths.corePath + '/server/errors'),
    models = require(config.paths.corePath + '/server/models'),
    schedulingUtils = require(config.paths.corePath + '/server/scheduling/utils'),
    serverUtils = require(config.paths.corePath + '/server/utils'),
    _private = {};

_private.normalize = function normalize(options) {
    var object = options.object,
        apiUrl = options.apiUrl,
        client = options.client,
        time = null;

    // CASE: newsletter was never executed, take the next iterator date
    if (!object.lastExecutedAt) {
        time = serverUtils.rrule.getNextDate({rruleString: object.rrule});
    } else {
        time = serverUtils.rrule.getNextDate({rruleString: object.rrule, date: object.lastExecutedAt});
    }

    return {
        time: moment(time).valueOf(),
        url: apiUrl + '/schedules/newsletter?client_id=' + client.get('slug') + '&client_secret=' + client.get('secret'),
        extra: {
            httpMethod: 'PUT',
            oldTime: object.lastExecutedAt ? moment(object.lastExecutedAt).valueOf() : null
        }
    };
};

_private.loadClient = function loadClient() {
    return models.Client.findOne({slug: 'ghost-scheduler'}, {columns: ['slug', 'secret']});
};

exports.init = function init(options) {
    options = options || {};

    var apiUrl = options.apiUrl,
        adapter = null,
        client = null;

    if (_.isEmpty(options)) {
        return Promise.reject(new errors.IncorrectUsage());
    }

    if (!apiUrl) {
        return Promise.reject(new errors.IncorrectUsage());
    }

    return _private.loadClient()
        .then(function (_client) {
            client = _client;

            return schedulingUtils.createAdapter(config);
        })
        .then(function (_adapter) {
            adapter = _adapter;

            adapter.reschedule(_private.normalize({
                object: {
                    lastExecutedAt: config.newsletter.lastExecutedAt,
                    rrule: config.newsletter.rrule
                },
                apiUrl: apiUrl,
                client: client
            }));

            return Promise.resolve();
        })
        .then(function () {
            adapter.run();
        })
        .then(function () {
            // @TODO: will be tested with integration test
            events.on('settings.newsletter.edited', function (object) {
                adapter.reschedule(_private.normalize({object: object, apiUrl: apiUrl, client: client}));
            });

            events.on('settings.newsletter.added', function (object) {
                adapter.schedule(_private.normalize({object: object, apiUrl: apiUrl, client: client}));
            });

            events.on('settings.newsletter.deleted', function (object) {
                adapter.unschedule(_private.normalize({object: object, apiUrl: apiUrl, client: client}));
            });
        });
};
