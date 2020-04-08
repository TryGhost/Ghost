// # Encode Helper
//
// Usage:  `{{encode uri}}`
//
// Returns URI encoded string

const {SafeString} = require('../services/proxy');

module.exports = function encode(string, options) {
    const uri = string || options;
    return new SafeString(encodeURIComponent(uri));
};
