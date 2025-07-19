const config = require('../../../../shared/config');

const ThemeI18n = require('./ThemeI18n');

module.exports = new ThemeI18n({basePath: config.getContentPath('themes')});
module.exports.ThemeI18n = ThemeI18n;
