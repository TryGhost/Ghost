const path = require('path');
const logging = require('@tryghost/logging');
const I18n = require('./i18n');

module.exports = new I18n({logging, basePath: path.join(__dirname, 'translations')});
module.exports.I18n = I18n;
