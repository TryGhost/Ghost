var errors      = require('../errors'),
    labsUtil    = require('../utils/labs'),
    labs;

labs = {
    subscribers: function subscribers(req, res, next) {
        if (labsUtil.isSet('subscribers') === true) {
            return next();
        } else {
            return errors.handleAPIError(new errors.NotFoundError(), req, res, next);
        }
    }
};

module.exports = labs;
