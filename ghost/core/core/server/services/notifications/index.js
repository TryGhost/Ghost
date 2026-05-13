const settingsCache = require('../../../shared/settings-cache');
const models = require('../../models');
const ghostVersion = require('@tryghost/version');
const {NotificationRepository} = require('./repository');
const {NotificationService} = require('./service');

const repository = new NotificationRepository({
    settingsCache,
    settingsModel: models.Settings
});

module.exports.notifications = new NotificationService({
    repository,
    ghostVersion
});
