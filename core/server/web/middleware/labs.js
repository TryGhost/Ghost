const labsUtil = require('../../services/labs');
const common = require('../../lib/common');

const labs = {
    subscribers: function subscribers(req, res, next) {
        if (labsUtil.isSet('subscribers') === true) {
            return next();
        } else {
            return next(new common.errors.NotFoundError());
        }
    }
};

module.exports = labs;
