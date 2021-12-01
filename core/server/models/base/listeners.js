const moment = require('moment-timezone');
const _ = require('lodash');
const models = require('../../models');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const Promise = require('bluebird');

// Listen to settings.timezone.edited and settings.notifications.edited to bind extra logic to settings, similar to the bridge and member service
const events = require('../../lib/common/events');

/**
 * WHEN timezone changes, we will:
 * - reschedule all scheduled posts
 * - draft scheduled posts, when the published_at would be in the past
 */
events.on('settings.timezone.edited', function (settingModel, options) {
    options = options || {};
    options = _.merge({}, options, {context: {internal: true}});

    const newTimezone = settingModel.attributes.value;
    const previousTimezone = settingModel._previousAttributes.value;
    const timezoneOffsetDiff = moment.tz(previousTimezone).utcOffset() - moment.tz(newTimezone).utcOffset();

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
    return models.Base.transaction(async function (transacting) {
        options.transacting = transacting;
        options.forUpdate = true;

        try {
            const results = await models.Post.findAll(_.merge({filter: 'status:scheduled'}, options));
            if (!results.length) {
                return;
            }

            await Promise.mapSeries(results, async (post) => {
                const newPublishedAtMoment = moment(post.get('published_at')).add(timezoneOffsetDiff, 'minutes');

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

                try {
                    await models.Post.edit(post.toJSON(), _.merge({id: post.id}, options));
                } catch (err) {
                    logging.error(new errors.InternalServerError({
                        err
                    }));
                }
            });
        } catch (err) {
            logging.error(new errors.InternalServerError({
                err: err,
                level: 'critical'
            }));
        }
    });
});

/**
 * Remove all notifications, which are seen, older than 3 months.
 * No transaction, because notifications are not sensitive and we would have to add `forUpdate`
 * to the settings model to create real lock.
 */
events.on('settings.notifications.edited', function (settingModel) {
    let allNotifications = JSON.parse(settingModel.attributes.value || []);
    const options = {context: {internal: true}};
    let skip = true;

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
        errors.logError(err);
    });
});
