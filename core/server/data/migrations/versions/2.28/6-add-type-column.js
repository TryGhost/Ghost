const Promise = require('bluebird');

// adding/removing columns is too slow for a minor release
// noop'd, will be re-introduced in Ghost 3.0
module.exports.up = () => Promise.resolve();
module.exports.down = () => Promise.resolve();
