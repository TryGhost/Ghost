var Promise = require('bluebird'),
    moment = require('moment'),
    debug = require('ghost-ignition').debug('subscribers-scheduling'),
    localUtils = require(__dirname + '/../utils'),
    config = require(__dirname + '/../../../config'),
    events = require(__dirname + '/../../../events'),
    errors = require(__dirname + '/../../../errors'),
    settingsCache = require(__dirname + '/../../../settings/cache'),
    models = require(__dirname + '/../../../models'),
    schedules = require(__dirname + '/../../../api/schedules'),
    utils = require(__dirname + '/../../../utils'),
    _private = {};

/**
 * If the `time` attribute is in the past, it doesn't matter because the scheduler can handle this and executes the url immediately.
 * e.g. you enable mailchimp, sync job get's scheduled, you disable the app, one day later you enable the app again. NextSyncAt would be in the past.
 */
_private.normalize = function normalize(options) {
    var apiUrl = options.apiUrl,
        client = options.client,
        time = options.time || moment().valueOf();

    debug('Add sync job for:', moment(time).format('YYYY-MM-DD HH:mm:ss'));

    return {
        time: time,
        url: _private.getUrl({client: client, apiUrl: apiUrl}),
        extra: {
            httpMethod: 'GET'
        }
    };
};

_private.getUrl = function getUrl(options) {
    var client = options.client,
        apiUrl = options.apiUrl;

    return utils.url.urlJoin(apiUrl, 'schedules', 'subscribers', 'sync') + '?client_id=' + client.get('slug') + '&client_secret=' + client.get('secret');
};

_private.loadClient = function loadClient() {
    return models.Client.findOne({slug: 'ghost-scheduler'}, {columns: ['slug', 'secret']});
};

exports.init = function init(options) {
    var config = options || {},
        apiUrl = config.apiUrl,
        adapter = null,
        client = null;

    if (!config) {
        return Promise.reject(new errors.IncorrectUsageError({message: 'scheduling for subscribers: no config was provided'}));
    }

    if (!apiUrl) {
        return Promise.reject(new errors.IncorrectUsageError({message: 'scheduling for subscribers: no apiUrl was provided'}));
    }

    return _private.loadClient()
        .then(function (_client) {
            client = _client;

            return localUtils.createAdapter(config);
        })
        .then(function (_adapter) {
            adapter = _adapter;
            adapter.run();
        })
        .then(function () {
            var nextSyncAtMoment = moment(settingsCache.get('mailchimp').nextSyncAt);

            /**
             * CASE:
             * On bootstrap we trigger the subscriber sync if an app for that is enabled.
             * Note: Right now there is only one app, that's why we ask for this app directly.
             * If we support multiple apps, we can generalise this e.g. apps.getActive({type: ...})
             */
            if (settingsCache.get('mailchimp').isActive) {
                adapter.reschedule(_private.normalize({apiUrl: apiUrl, client: client, time: settingsCache.get('mailchimp').nextSyncAt}));
            }
        })
        .then(function () {
            // CASE: App get's activated or modified. Ensure we trigger a sync.
            // Note: Hardcoded for mail chimp, because we don't offer multiple integrations yet.
            events.onMany([
                'settings.mailchimp.edited'
            ], function (object) {
                var mailchimpConfig = JSON.parse(object.get('value')),
                    updatedMailchimpConfig = JSON.parse(object.updated('value')),
                    nextSyncAtMoment = moment(mailchimpConfig.nextSyncAt);

                // CASE: App is inactive.
                if (!mailchimpConfig.isActive) {
                    if (nextSyncAtMoment.isValid()) {
                        debug('Delete sync job.');

                        adapter._deleteJob({
                            time: nextSyncAtMoment.valueOf(),
                            url: _private.getUrl({client: client, apiUrl: apiUrl})
                        });
                    }

                    return;
                }

                // NOTE: It doesn't matter if the apiKey or if the active list changes, because the target sync endpoint uses updated data.
                // CASE: App was never synced. Sync now.
                // CASE: You disable/enable the app without restarting Ghost.
                if (!nextSyncAtMoment.isValid() || !updatedMailchimpConfig.isActive) {
                    return adapter.schedule(_private.normalize({apiUrl: apiUrl, client: client, time: moment().valueOf()}));
                }

                // CASE: NextSyncAt has changed, trigger the next job for tomorrow.
                if (updatedMailchimpConfig.nextSyncAt !== mailchimpConfig.nextSyncAt) {
                    return adapter.schedule(_private.normalize({apiUrl: apiUrl, client: client, time: nextSyncAtMoment.valueOf()}));
                }
            });
        });
};
