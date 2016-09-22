// # Encode Helper
//
// Usage:  `{{encode uri}}`
//
// Returns URI encoded string

var hbs = require('express-hbs'),
    encode;

encode = function (string, options) {
    var uri = string || options;
    return new hbs.handlebars.SafeString(encodeURIComponent(uri));
};

module.exports = encode;
