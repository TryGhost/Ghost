var backup = require('../../../schema/backup'),
    models = require('../../../../models');

module.exports = function before(options) {
    models.init();
    return backup(options);
};
