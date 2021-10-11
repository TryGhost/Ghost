const settingsCache = require('../../../shared/settings-cache');
const ghostVersion = require('@tryghost/version');
const Notifications = require('./notifications');
const models = require('../../models');

module.exports.notifications = new Notifications({
    settingsCache,
    ghostVersion: ghostVersion.full,
    SettingsModel: models.Settings
});
