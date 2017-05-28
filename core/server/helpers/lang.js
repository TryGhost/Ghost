// # lang helper
// {{lang}} gives the current language tag
// Usage example: <html lang="{{lang}}">
//
// Examples of language tags from RFC 5646:
// de (German)
// fr (French)
// ja (Japanese)
// en-US (English as used in the United States)
//
// Standard:
// Language tags in HTML and XML
// https://www.w3.org/International/articles/language-tags/

var proxy = require('./proxy'),
    i18n = proxy.i18n,
    SafeString = proxy.SafeString;

module.exports = function lang() {
    return new SafeString(i18n.locale());
};
