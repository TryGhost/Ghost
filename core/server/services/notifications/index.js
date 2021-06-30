const settingsCache = require('../../../shared/settings-cache');
const i18n = require('../../../shared/i18n');
const ghostVersion = require('@tryghost/version');
const Notifications = require('./notifications');
const models = require('../../models');

module.exports.notifications = new Notifications({
    settingsCache,
    i18n,
    ghostVersion,
    SettingsModel: models.Settings
});
