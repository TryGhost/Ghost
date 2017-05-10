// # t_css helper
// i18n: Helper enabling a stylesheet file such as /assets/css/es.css
// to translate css content by overriding.
// This is used for example in Casper's default.hbs theme template file:
// <link rel="stylesheet" type="text/css" href="{{t_css}}" />
// which results in something like:
// <link rel="stylesheet" type="text/css" href="/assets/css/es.css?v=15890d2423" />
//
// We use the name t_css to match the helper for consistency:
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers

var proxy = require('./proxy'),
    i18n = proxy.i18n,
    SafeString = proxy.SafeString,
    getAssetUrl = proxy.metaData.getAssetUrl,
    locale = i18n.locale(),
    tCss;

module.exports = function t_css() {
    tCss = new SafeString(getAssetUrl('css/' + locale + '.css'));
    return tCss;
};
