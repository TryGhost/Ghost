const settingsCache = require('../settings/cache');
const i18n = require('../../../shared/i18n');
const ghostVersion = require('@tryghost/version');
const Notifications = require('./notifications');

module.exports.notifications = new Notifications({settingsCache, i18n, ghostVersion});
