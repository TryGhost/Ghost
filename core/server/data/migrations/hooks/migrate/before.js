var backup = require('../../../db/backup'),
    models = require('../../../../models');

module.exports = function before(options) {
    models.init();
    return backup(options);
};
