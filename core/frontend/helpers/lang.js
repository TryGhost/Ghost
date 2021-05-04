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

const {SafeString} = require('../services/proxy');

module.exports = function lang(options) {
    const locale = options.data.site.locale;
    return new SafeString(locale);
};
