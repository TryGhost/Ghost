var backup = require('../../../db/backup'),
    models = require('../../../../models');

module.exports = function before() {
    models.init();
    return backup();
};
