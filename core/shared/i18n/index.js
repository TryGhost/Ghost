const logging = require('../logging');

const I18n = require('./i18n');

module.exports = new I18n({logging});
module.exports.I18n = I18n;
