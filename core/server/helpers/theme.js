// # theme helper
// {{theme}} gives the simplified name of the active theme, as used in file names, etc.
//
// Handlebars subexpressions such as (theme) can be used in parameters, e.g.:
// {{asset "translations/{theme}_{lang}.css" theme=(theme) lang=(lang)}}
// which can be equivalent to: {{asset "translations/mytheme_en-US.css"}}

var proxy = require('./proxy'),
    SafeString = proxy.SafeString,
    settingsCache = proxy.settingsCache;

module.exports = function theme() {
    var currentTheme = settingsCache.get('active_theme') || 'casper';
    return new SafeString(currentTheme);
};
