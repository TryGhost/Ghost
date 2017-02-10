var some = require('lodash/some'),
    Promise = require('bluebird'),

    i18n   = require('../i18n'),
    config = require('../config'),
    errors = require('../errors'),
    pipeline = require('../utils/pipeline'),
    dataProvider = require('../models');

module.exports = function update(options) {
    function handlePermissions() {
        return dataProvider.User.findOne({id: options.context.user}, {include: ['roles']}).then(function then(user) {
            if (!user) {
                return Promise.reject(new errors.NotFoundError({message: i18n.t('errors.api.users.userNotFound')}));
            }

            return user;
        }).then(function afterLoad(user) {
            if (user.related('roles').models[0].get('name') !== 'Owner') {
                return Promise.reject(new errors.NoPermissionError({
                    message: i18n.t('errors.api.update.notAllowedToUpdate')
                }));
            }
        });
    }

    function checkForUpdate() {
        var updateCheck = require('../update-check');

        return updateCheck().then(function then() {
            return updateCheck.showUpdateNotification();
        }).then(function then(updateVersion) {
            if (!updateVersion) {
                return Promise.reject(new errors.UpdateError({message: i18n.t('errors.api.update.noUpdateAvailable')}));
            }
        });
    }

    function doUpdate() {
        if (!config.get('update') || !process.send) {
            return Promise.reject(new errors.UpdateError({
                message: i18n.t('errors.api.update.cantUpdate'),
                statusCode: 501
            }));
        }

        process.send({update: true});
    }

    var tasks = [
        handlePermissions,
        checkForUpdate,
        doUpdate
    ];

    return pipeline(tasks);
};
