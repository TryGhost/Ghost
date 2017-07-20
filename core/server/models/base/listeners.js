var config = require('../../config'),
    events = require(config.get('paths:corePath') + '/server/events'),
    models = require(config.get('paths:corePath') + '/server/models'),
    errors = require(config.get('paths:corePath') + '/server/errors'),
    logging = require(config.get('paths:corePath') + '/server/logging'),
    sequence = require(config.get('paths:corePath') + '/server/utils/sequence'),
    moment = require('moment-timezone'),
    _ = require('lodash');

/**
 * WHEN access token is created we will update last_seen for user.
 */
events.on('token.added', function (tokenModel) {
    models.User.edit({last_seen: moment().toDate()}, {id: tokenModel.get('user_id')})
        .catch(function (err) {
            logging.error(new errors.GhostError({err: err, level: 'critical'}));
        });
});

/**
 * WHEN user get's suspended (status=inactive), we delete his tokens to ensure
 * he can't login anymore
 *
 * NOTE:
 *   - this event get's triggered either on user update (suspended) or if an **active** user get's deleted.
 *   - if an active user get's deleted, we have to access the previous attributes, because this is how bookshelf works
 *     if you delete a user.
 */
events.on('user.deactivated', function (userModel, options) {
    options = options || {};
    options = _.merge({}, options, {id: userModel.id || userModel.previousAttributes().id});

    if (options.importing) {
        return;
    }

    models.Accesstoken.destroyByUser(options)
        .then(function () {
            return models.Refreshtoken.destroyByUser(options);
        })
        .catch(function (err) {
            logging.error(new errors.GhostError({
                err: err,
                level: 'critical'
            }));
        });
});

/**
 * WHEN timezone changes, we will:
 * - reschedule all scheduled posts
 * - draft scheduled posts, when the published_at would be in the past
 */
events.on('settings.active_timezone.edited', function (settingModel, options) {
    options = options || {};
    options = _.merge({}, options, {context: {internal: true}});

    var newTimezone = settingModel.attributes.value,
        previousTimezone = settingModel._updatedAttributes.value,
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
                        logging.error(new errors.GhostError({
                            err: result.reason()
                        }));
                    }
                });
            })
            .catch(function (err) {
                logging.error(new errors.GhostError({
                    err: err,
                    level: 'critical'
                }));
            });
    });
});
