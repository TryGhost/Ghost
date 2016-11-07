var Promise = require('bluebird'),
    models = require('../../../../models');

module.exports = function before() {
    models.init();
    return Promise.resolve();
};
