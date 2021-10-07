const settingsCache = require('../../../shared/settings-cache');
const tpl = require('@tryghost/tpl');
const ghostVersion = require('@tryghost/version');
const Notifications = require('./notifications');
const models = require('../../models');

module.exports.notifications = new Notifications({
    settingsCache,
    tpl,
    ghostVersion,
    SettingsModel: models.Settings
});
