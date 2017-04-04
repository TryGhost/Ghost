// # Encode Helper
//
// Usage:  `{{encode uri}}`
//
// Returns URI encoded string

var proxy = require('./proxy'),
    SafeString = proxy.SafeString;

module.exports = function encode(string, options) {
    var uri = string || options;
    return new SafeString(encodeURIComponent(uri));
};
