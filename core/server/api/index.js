const defaultAPI = require('./canary');

module.exports = defaultAPI;
module.exports.canary = defaultAPI;
module.exports.v4 = defaultAPI;
module.exports.v3 = require('./v3');
module.exports.v2 = require('./v2');

module.exports.shared = require('./shared');
