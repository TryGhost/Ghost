var config = require('../../../../config'),
    models = require(config.paths.corePath + '/server/models'),
    api = require(config.paths.corePath + '/server/api'),
    sequence = require(config.paths.corePath + '/server/utils/sequence'),
    moment = require('moment-timezone'),
    _ = require('lodash'),
    Promise = require('bluebird'),
    messagePrefix = 'Transforming dates to UTC: ',
    settingsKey = '006/01',
    _private = {};

_private.getTZOffset = function getTZOffset(date) {
    return date.getTimezoneOffset();
};

_private.getTZOffsetMax = function getTZOffsetMax() {
    return Math.max(Math.abs(new Date('2015-07-01').getTimezoneOffset()), Math.abs(new Date('2015-01-01').getTimezoneOffset()));
};

_private.addOffset = function addOffset(date) {
    if (_private.noOffset) {
        return moment(date).toDate();
    }

    return moment(date).add(_private.getTZOffset(date), 'minutes').toDate();
};

/**
 * postgres: stores dates with offset, so it's enough to force timezone UTC in the db connection (see data/db/connection.js)
 * sqlite: stores UTC timestamps, but we will normalize the format to YYYY-MM-DD HH:mm:ss
 */
module.exports = function transformDatesIntoUTC(options, logger) {
    var ServerTimezoneOffset = _private.getTZOffsetMax(),
        settingsMigrations = null;

    // will ensure updated_at fields will not be updated, we take them from the original models
    options.importing = true;

    return sequence([
        function databaseCheck() {
            // we have to change the sqlite format, because it stores dates as integer
            if (ServerTimezoneOffset === 0 && config.database.client === 'mysql') {
                return Promise.reject(new Error('skip'));
            }

            if (config.database.isPostgreSQL()) {
                _private.noOffset = true;
            } else if (config.database.client === 'mysql') {
                _private.noOffset = false;
            } else if (config.database.client === 'sqlite3') {
                _private.noOffset = true;
            }

            logger.info(messagePrefix + '(could take a while)...');
            return Promise.resolve();
        },
        function checkIfMigrationAlreadyRan() {
            return models.Settings.findOne({key: 'migrations'}, options)
                .then(function (result) {
                    try {
                        settingsMigrations = JSON.parse(result.attributes.value) || {};
                    } catch (err) {
                        return Promise.reject(err);
                    }

                    // CASE: migration ran already
                    if (settingsMigrations.hasOwnProperty(settingsKey)) {
                        return Promise.reject(new Error('skip'));
                    }

                    return Promise.resolve();
                });
        },
        function updatePosts() {
            return models.Post.findAll(options).then(function (result) {
                if (result.models.length === 0) {
                    logger.warn(messagePrefix + 'No Posts found');
                    return;
                }

                return Promise.mapSeries(result.models, function mapper(post) {
                    if (post.get('published_at')) {
                        post.set('published_at', _private.addOffset(post.get('published_at')));
                    }

                    if (post.get('updated_at')) {
                        post.set('updated_at', _private.addOffset(post.get('updated_at')));
                    }

                    post.set('created_at', _private.addOffset(post.get('created_at')));
                    return models.Post.edit(post.toJSON(), _.merge({}, options, {id: post.get('id')}));
                }).then(function () {
                    logger.info(messagePrefix + 'Updated datetime fields for Posts');
                });
            });
        },
        function updateUsers() {
            return models.User.findAll(options).then(function (result) {
                if (result.models.length === 0) {
                    logger.warn(messagePrefix + 'No Users found');
                    return;
                }

                return Promise.mapSeries(result.models, function mapper(user) {
                    if (user.get('last_login')) {
                        user.set('last_login', _private.addOffset(user.get('last_login')));
                    }

                    if (user.get('updated_at')) {
                        user.set('updated_at', _private.addOffset(user.get('updated_at')));
                    }

                    user.set('created_at', _private.addOffset(user.get('created_at')));
                    return models.User.edit(user.toJSON(), _.merge({}, options, {id: user.get('id')}));
                }).then(function () {
                    logger.info(messagePrefix + 'Updated datetime fields for Users');
                });
            });
        },
        function updateSubscribers() {
            return models.Subscriber.findAll(options).then(function (result) {
                if (result.models.length === 0) {
                    logger.warn(messagePrefix + 'No Subscribers found');
                    return;
                }

                return Promise.mapSeries(result.models, function mapper(subscriber) {
                    if (subscriber.get('unsubscribed_at')) {
                        subscriber.set('unsubscribed_at', _private.addOffset(subscriber.get('unsubscribed_at')));
                    }

                    if (subscriber.get('updated_at')) {
                        subscriber.set('updated_at', _private.addOffset(subscriber.get('updated_at')));
                    }

                    subscriber.set('created_at', _private.addOffset(subscriber.get('created_at')));
                    return models.Subscriber.edit(subscriber.toJSON(), _.merge({}, options, {id: subscriber.get('id')}));
                }).then(function () {
                    logger.info(messagePrefix + 'Updated datetime fields for Subscribers');
                });
            });
        },
        function updateSettings() {
            return models.Settings.findAll(options).then(function (result) {
                if (result.models.length === 0) {
                    logger.warn(messagePrefix + 'No Settings found');
                    return;
                }

                return Promise.mapSeries(result.models, function mapper(settings) {
                    // migrations was new created, so it already is in UTC
                    if (settings.get('key') === 'migrations') {
                        return Promise.resolve();
                    }

                    if (settings.get('updated_at')) {
                        settings.set('updated_at', _private.addOffset(settings.get('updated_at')));
                    }

                    settings.set('created_at', _private.addOffset(settings.get('created_at')));
                    return models.Settings.edit(settings.toJSON(), _.merge({}, options, {id: settings.get('id')}));
                }).then(function () {
                    logger.info(messagePrefix + 'Updated datetime fields for Settings');
                });
            });
        },
        function updateAllOtherModels() {
            return Promise.mapSeries(['Role', 'Permission', 'Tag', 'App', 'AppSetting', 'AppField', 'Client'], function (model) {
                return models[model].findAll(options).then(function (result) {
                    if (result.models.length === 0) {
                        logger.warn(messagePrefix + 'No {model} found'.replace('{model}', model));
                        return;
                    }

                    return Promise.mapSeries(result.models, function mapper(object) {
                        object.set('created_at', _private.addOffset(object.get('created_at')));

                        if (object.get('updated_at')) {
                            object.set('updated_at', _private.addOffset(object.get('updated_at')));
                        }

                        return models[model].edit(object.toJSON(), _.merge({}, options, {id: object.get('id')}));
                    }).then(function () {
                        logger.info(messagePrefix + 'Updated datetime fields for {model}'.replace('{model}', model));
                    });
                });
            });
        },
        function setActiveTimezone() {
            var timezone = config.forceTimezoneOnMigration || moment.tz.guess();
            return models.Settings.edit({
                key: 'activeTimezone',
                value: timezone
            }, options);
        },
        function addMigrationSettingsEntry() {
            settingsMigrations[settingsKey] = moment().format();
            return models.Settings.edit({
                key: 'migrations',
                value: JSON.stringify(settingsMigrations)
            }, options);
        },
        function updateSettingsCache() {
            return api.settings.updateSettingsCache(null, options);
        }]
    ).catch(function (err) {
        if (err.message === 'skip') {
            logger.warn(messagePrefix + 'Your databases uses UTC datetimes, skip!');
            return Promise.resolve();
        }

        return Promise.reject(err);
    });
};
