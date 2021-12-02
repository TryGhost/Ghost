const defaultAPI = require('./canary');

module.exports = defaultAPI;
module.exports.canary = defaultAPI;

module.exports.shared = require('./shared');
