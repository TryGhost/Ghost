const i18n = require('./lib/i18n');

// Explicit exports for better bundler compatibility
module.exports = i18n;
module.exports.default = i18n;
module.exports.LOCALE_DATA = i18n.LOCALE_DATA;
module.exports.SUPPORTED_LOCALES = i18n.SUPPORTED_LOCALES;
module.exports.generateResources = i18n.generateResources;
