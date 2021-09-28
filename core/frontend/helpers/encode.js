// # Encode Helper
//
// Usage:  `{{encode uri}}`
//
// Returns URI encoded string

const {SafeString} = require('../services/rendering');

module.exports = function encode(string, options) {
    const uri = string || options;
    return new SafeString(encodeURIComponent(uri));
};
