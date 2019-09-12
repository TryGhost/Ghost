var moment = require('moment-timezone'),
    _ = require('lodash'),
    models = require('../../models'),
    common = require('../../lib/common'),
    sequence = require('../../lib/promise/sequence');

/**
 * WHEN timezone changes, we will:
 * - reschedule all scheduled posts
 * - draft scheduled posts, when the published_at would be in the past
 */
common.events.on('settings.active_timezone.edited', function (settingModel, options) {
    options = options || {};
    options = _.merge({}, options, {context: {internal: true}});

    var newTimezone = settingModel.attributes.value,
        previousTimezone = settingModel._previousAttributes.value,
        timezoneOffsetDiff = moment.tz(previousTimezone).utcOffset() - moment.tz(newTimezone).utcOffset();

    // CASE: TZ was updated, but did not change
    if (previousTimezone === newTimezone) {
        return;
    }

    if (options.importing) {
        return;
    }

    /**
     * CASE:
     * `Post.findAll` and the Post.edit` must run in one single transaction.
     * We lock the target row on fetch by using the `forUpdate` option.
     * Read more in models/post.js - `onFetching`
     */
    return models.Base.transaction(function (transacting) {
        options.transacting = transacting;
        options.forUpdate = true;

        return models.Post.findAll(_.merge({filter: 'status:scheduled'}, options))
            .then(function (results) {
                if (!results.length) {
                    return;
                }

                return sequence(results.map(function (post) {
                    return function reschedulePostIfPossible() {
                        var newPublishedAtMoment = moment(post.get('published_at')).add(timezoneOffsetDiff, 'minutes');

                        /**
                         * CASE:
                         *   - your configured TZ is GMT+01:00
                         *   - now is 10AM +01:00 (9AM UTC)
                         *   - your post should be published 8PM +01:00 (7PM UTC)
                         *   - you reconfigure your blog TZ to GMT+08:00
                         *   - now is 5PM +08:00 (9AM UTC)
                         *   - if we don't change the published_at, 7PM + 8 hours === next day 5AM
                         *   - so we update published_at to 7PM - 480minutes === 11AM UTC
                         *   - 11AM UTC === 7PM +08:00
                         */
                        if (newPublishedAtMoment.isBefore(moment().add(5, 'minutes'))) {
                            post.set('status', 'draft');
                        } else {
                            post.set('published_at', newPublishedAtMoment.toDate());
                        }

                        return models.Post.edit(post.toJSON(), _.merge({id: post.id}, options)).reflect();
                    };
                })).each(function (result) {
                    if (!result.isFulfilled()) {
                        common.logging.error(new common.errors.GhostError({
                            err: result.reason()
                        }));
                    }
                });
            })
            .catch(function (err) {
                common.logging.error(new common.errors.GhostError({
                    err: err,
                    level: 'critical'
                }));
            });
    });
});

/**
 * Remove all notifications, which are seen, older than 3 months.
 * No transaction, because notifications are not sensitive and we would have to add `forUpdate`
 * to the settings model to create real lock.
 */
common.events.on('settings.notifications.edited', function (settingModel) {
    var allNotifications = JSON.parse(settingModel.attributes.value || []),
        options = {context: {internal: true}},
        skip = true;

    allNotifications = allNotifications.filter(function (notification) {
        // Do not delete the release notification
        if (Object.prototype.hasOwnProperty.call(notification, 'custom') && !notification.custom) {
            return true;
        }

        if (notification.seen && moment().diff(moment(notification.addedAt), 'month') > 2) {
            skip = false;
            return false;
        }

        return true;
    });

    if (skip) {
        return;
    }

    return models.Settings.edit({
        key: 'notifications',
        value: JSON.stringify(allNotifications)
    }, options).catch(function (err) {
        common.errors.logError(err);
    });
});
