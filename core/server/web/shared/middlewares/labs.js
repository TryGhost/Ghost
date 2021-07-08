const errors = require('@tryghost/errors');
const labsUtil = require('../../../../shared/labs');

const labs = flag => (req, res, next) => {
    if (labsUtil.isSet(flag) === true) {
        return next();
    } else {
        return next(new errors.NotFoundError());
    }
};

module.exports = labs;
