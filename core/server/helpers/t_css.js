// # t_css helper
// i18n: Helper enabling a stylesheet file such as /assets/translations/mytheme_es.css
// to translate css content by overriding.
// This is used for example in Casper's default.hbs theme template file:
// <link rel="stylesheet" type="text/css" href="{{t_css}}" />
// which results in something like:
// <link rel="stylesheet" type="text/css" href="/assets/translations/casper_es.css?v=15890d2423" />
//
// We use the name t_css to match the helper for consistency:
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers

var proxy = require('./proxy'),
    i18n = proxy.i18n,
    SafeString = proxy.SafeString,
    getAssetUrl = proxy.metaData.getAssetUrl,
    settingsCache = proxy.settingsCache,
    theme,
    locale,
    tCss;

module.exports = function t_css() {
    theme = settingsCache.get('active_theme');
    locale = i18n.locale();
    tCss = new SafeString(getAssetUrl('translations/' + theme + '_' + locale + '.css'));
    return tCss;
};
