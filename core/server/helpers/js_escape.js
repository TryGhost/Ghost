// # JavaScript String Escape Helper
//
// Usage:  `{{js_escape uri}}`
//
// Returns JavaScript-escaped string.
//
// All other helpers use snake_case, so for consistency this one does too.
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers

var hbs          = require('express-hbs'),
    REPLACEMENTS,
    js_escape;

REPLACEMENTS = [
    ['\\', '\\\\'],
    ['\'', '\\\''],
    ['\"', '\\\"'],
    ['\n', '\\n'],
    ['\t', '\\t'],
    ['\r', '\\r'],
    ['\b', '\\b'],
    ['\v', '\\v'],
    ['\f', '\\f']
];

js_escape = function (context, str) {
    str = context || str;
    var i,
        pair;
    for (i = 0; i < REPLACEMENTS.length; i += 1) {
        pair = REPLACEMENTS[i];
        str = str.replace(pair[0], pair[1]);
    }
    return new hbs.handlebars.SafeString(str);
};

module.exports = js_escape;

