// # Encode Helper
//
// Usage:  `{{encode uri}}`
//
// Returns URI encoded string

var hbs             = require('express-hbs'),
    encode;

encode = function (context, str) {
    var uri = context || str;
    return new hbs.handlebars.SafeString(encodeURIComponent(uri));
};

module.exports = encode;
