var config = require('../../config'),
    events = require(config.paths.corePath + '/server/events'),
    models = require(config.paths.corePath + '/server/models'),
    errors = require(config.paths.corePath + '/server/errors'),
    sequence = require(config.paths.corePath + '/server/utils/sequence'),
    moment = require('moment-timezone'),
    _ = require('lodash');

/**
 * WHEN access token is created we will update last_login for user.
 */
events.on('token.added', function (tokenModel) {
    models.User.edit({last_login: moment().toDate()}, {id: tokenModel.get('user_id')})
        .catch(function (err) {
            errors.logError(err);
        });
});

/**
 * WHEN timezone changes, we will:
 * - reschedule all scheduled posts
 * - draft scheduled posts, when the published_at would be in the past
 */
events.on('settings.activeTimezone.edited', function (settingModel) {
    var newTimezone = settingModel.attributes.value,
        previousTimezone = settingModel._updatedAttributes.value,
        timezoneOffsetDiff = moment.tz(previousTimezone).utcOffset() - moment.tz(newTimezone).utcOffset(),
        options = {context: {internal: true}};

    // CASE: TZ was updated, but did not change
    if (previousTimezone === newTimezone) {
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
                        errors.logError(result.reason());
                    }
                });
            })
            .catch(function (err) {
                errors.logError(err);
            });
    });
});
