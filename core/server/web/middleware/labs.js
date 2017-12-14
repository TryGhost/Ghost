var labsUtil = require('../../services/labs'),
    common = require('../../lib/common'),
    labs;

labs = {
    subscribers: function subscribers(req, res, next) {
        if (labsUtil.isSet('subscribers') === true) {
            return next();
        } else {
            return next(new common.errors.NotFoundError());
        }
    }
};

module.exports = labs;
