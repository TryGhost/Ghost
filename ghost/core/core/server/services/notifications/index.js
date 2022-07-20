const settingsCache = require('../../../shared/settings-cache');
const Notifications = require('./notifications');
const models = require('../../models');

module.exports.notifications = new Notifications({
    settingsCache,
    SettingsModel: models.Settings
});
