const settingsCache = require('../../../shared/settings-cache');
const Notifications = require('./Notifications');
const models = require('../../models');

module.exports.notifications = new Notifications({
    settingsCache,
    SettingsModel: models.Settings
});
