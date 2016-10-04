var errors      = require('../errors'),
    labsUtil    = require('../utils/labs'),
    labs;

labs = {
    subscribers: function subscribers(req, res, next) {
        if (labsUtil.isSet('subscribers') === true) {
            return next();
        } else {
            return next(new errors.NotFoundError());
        }
    }
};

module.exports = labs;
