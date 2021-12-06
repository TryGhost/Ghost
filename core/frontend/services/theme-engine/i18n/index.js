const config = require('../../../../shared/config');

const ThemeI18n = require('./theme-i18n');

module.exports = new ThemeI18n({basePath: config.getContentPath('themes')});
module.exports.ThemeI18n = ThemeI18n;
