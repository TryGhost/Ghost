const config = require('../../../../shared/config');
const logging = require('@tryghost/logging');

const ThemeI18n = require('./i18n');

module.exports = new ThemeI18n({logging, basePath: config.getContentPath('themes')});
module.exports.ThemeI18n = ThemeI18n;
