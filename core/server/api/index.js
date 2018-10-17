const config = require('../config');
module.exports = require('./v0.1');
module.exports['v0.1'] = require('./v0.1');
module.exports.v2 = require('./v2');
module.exports.active = require(`./${config.get('api:versions:active')}`);
