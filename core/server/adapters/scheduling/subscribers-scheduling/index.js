var Promise = require('bluebird'),
    moment = require('moment'),
    debug = require('ghost-ignition').debug('subscribers-scheduling'),
    localUtils = require(__dirname + '/../utils'),
    events = require(__dirname + '/../../../events'),
    errors = require(__dirname + '/../../../errors'),
    settingsCache = require(__dirname + '/../../../settings/cache'),
    models = require(__dirname + '/../../../models'),
    utils = require(__dirname + '/../../../utils'),
    _private = {
        staticTimestampPast: 1504166713386
    };

/**
 * If the `time` attribute is in the past, it doesn't matter because the scheduler can handle this and executes the url immediately.
 * e.g. you enable mailchimp, sync job get's scheduled, you disable the app, one day later you enable the app again. NextSyncAt would be in the past.
 */
_private.normalize = function normalize(options) {
    var apiUrl = options.apiUrl,
        client = options.client,
        time = options.time || moment().valueOf(),
        email = options.email,
        method = email ? 'POST' : 'GET',
        url = _private.getUrl({client: client, apiUrl: apiUrl, email: email}),
        oldTime = options.oldTime;

    debug('Add sync job for:', moment(time).format('YYYY-MM-DD HH:mm:ss'), url);

    return {
        time: time,
        url: url,
        extra: {
            httpMethod: method,
            oldTime: oldTime,
            // NOTE: 300 seconds is long, but subscriber sync can take a while.
            timeoutInMS: 1000 * 300
        }
    };
};

_private.getUrl = function getUrl(options) {
    var client = options.client,
        apiUrl = options.apiUrl,
        email = options.email,
        url;

    if (!email) {
        url = utils.url.urlJoin(apiUrl, 'schedules', 'subscribers', 'sync');
    } else {
        url = utils.url.urlJoin(apiUrl, 'schedules', 'subscribers', 'add', email);
    }

    return url + '?client_id=' + client.get('slug') + '&client_secret=' + client.get('secret');
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
            /**
             * CASE:
             * On bootstrap we trigger the subscriber sync if an app for that is enabled.
             *
             * NOTE: Right now there is only one app, that's why we ask for this app directly.
             * If we support multiple apps, we can generalise this e.g. apps.getActive({type: ...})
             *
             * NOTE: Ensure we delete the old job. E.g. you restart Ghost twice. (only important for Pro scheduling)
             */
            if (settingsCache.get('mailchimp').isActive) {
                var nextSyncAtMoment = moment(settingsCache.get('scheduling').subscribers.nextSyncAt);

                debug('Delete sync job.');

                // CASE: Was never synced, sync now!
                if (!nextSyncAtMoment.isValid()) {
                    nextSyncAtMoment = moment(_private.staticTimestampPast);
                }

                // NOTE: reschedule without the old timestamp, because the default scheduler handles job deletion based on url+time.
                // That would mean no job is scheduled, because the timestamp would be equal for deleting and adding.
                // Rescheduling on Pro is url based.
                adapter.reschedule(_private.normalize({
                    apiUrl: apiUrl,
                    client: client,
                    time: nextSyncAtMoment.valueOf()
                }));
            }
        })
        .then(function () {
            // CASE: Ensure we re-insert the sync job.
            events.on('settings.scheduling.edited', function (object) {
                var schedulingConfig = JSON.parse(object.get('value')),
                    updatedSchedulingConfig = JSON.parse(object.updated('value')),
                    nextSyncAtMoment = moment(schedulingConfig.subscribers.nextSyncAt);

                if (!settingsCache.get('mailchimp').isActive) {
                    return;
                }

                // CASE: NextSyncAt has changed, trigger the next job for tomorrow.
                if (updatedSchedulingConfig.subscribers.nextSyncAt !== schedulingConfig.subscribers.nextSyncAt) {
                    return adapter.schedule(_private.normalize({
                        apiUrl: apiUrl,
                        client: client,
                        time: nextSyncAtMoment.valueOf()
                    }));
                }
            });

            // NOTE: Hardcoded for mail chimp, because we don't offer multiple integrations yet.
            events.on('settings.mailchimp.edited', function (object) {
                var mailchimpConfig = JSON.parse(object.get('value')),
                    updatedMailchimpConfig = JSON.parse(object.updated('value')),
                    schedulingConfig = settingsCache.get('scheduling').subscribers,
                    nextSyncAtMoment = moment(schedulingConfig.nextSyncAt);

                // CASE: App get's deactivated or is already deactivated. Ensure we delete the job.
                if (!mailchimpConfig.isActive) {
                    if (!updatedMailchimpConfig.isActive) {
                        return;
                    }

                    if (!nextSyncAtMoment.isValid()) {
                        nextSyncAtMoment = moment(_private.staticTimestampPast);
                    }

                    debug('Delete sync job.');

                    adapter.unschedule({
                        time: nextSyncAtMoment.valueOf(),
                        url: _private.getUrl({client: client, apiUrl: apiUrl})
                    });

                    return;
                }

                // CASE: App was never synced. No active list. No nextSyncAt. Sync now!
                if (!nextSyncAtMoment.isValid() && !updatedMailchimpConfig.activeList.id) {
                    return adapter.schedule(_private.normalize({
                        apiUrl: apiUrl,
                        client: client,
                        time: _private.staticTimestampPast
                    }));
                }

                // CASE: You change the mailchimp list. Trigger immediate sync.
                // Only if the list changed. Initial sync happened already.
                if (nextSyncAtMoment.isValid() && updatedMailchimpConfig.activeList.id !== mailchimpConfig.activeList.id) {
                    return adapter.reschedule(_private.normalize({
                        apiUrl: apiUrl,
                        client: client,
                        time: _private.staticTimestampPast,
                        oldTime: nextSyncAtMoment.valueOf()
                    }));
                }

                // CASE: You disable/enable the app without restarting Ghost. Was inactive before.
                if (!updatedMailchimpConfig.isActive) {
                    return adapter.reschedule(_private.normalize({
                        apiUrl: apiUrl,
                        client: client,
                        time: _private.staticTimestampPast,
                        oldTime: nextSyncAtMoment.valueOf()
                    }));
                }
            });

            /**
             * Every time a subscriber is added to the local database, we sync the subscriber with the app which is active.
             * NOTE: We only support mailchimp at the moment.
             */
            events.on('subscriber.added', function (object, options) {
                // CASE: If you are adding a subscriber internally, do not sync this. Only when adding via admin/frontend.
                if (options && options.context && options.context.internal) {
                    return;
                }

                return adapter.schedule(_private.normalize({
                    apiUrl: apiUrl,
                    client: client,
                    time: _private.staticTimestampPast,
                    email: object.get('email')
                }));
            });
        });
};
