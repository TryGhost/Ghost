const loader = require('./loader');

module.exports = loader.loadNconf();
module.exports.withOptions = (options) => loader.loadNconf(options);
