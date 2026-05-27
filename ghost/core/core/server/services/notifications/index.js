const settingsCache = require('../../../shared/settings-cache');
const settingsService = require('../settings/settings-service');
const models = require('../../models');
const {Notifications} = require('./notifications');
const {NotificationRepository} = require('./repository');

const repository = new NotificationRepository({
    settingsCache,
    getSettingsBREADService: () => settingsService.getSettingsBREADServiceInstance(),
    settingsModel: models.Settings
});

module.exports.notifications = new Notifications({repository});
