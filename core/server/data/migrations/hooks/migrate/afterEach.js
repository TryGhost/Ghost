var Promise = require('bluebird');

module.exports = function afterEach() {
    return Promise.resolve();
};
