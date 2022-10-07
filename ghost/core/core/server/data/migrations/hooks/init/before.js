const Promise = require('bluebird');
const models = require('../../../../models');

module.exports = function before() {
    models.init();
    return Promise.resolve();
};
