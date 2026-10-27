// # Encode Helper
//
// Usage:  `{{encode uri}}`
//
// Returns URI encoded string

const { SafeString } = require('../services/handlebars');

module.exports = function encode(string) {
  // `{{encode}}` with no value passes the Handlebars options object as `string`
  if (string === undefined || string === null || (arguments.length === 1 && string.hash)) {
    return new SafeString('');
  }

  return new SafeString(encodeURIComponent(string));
};
