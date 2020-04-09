const errors = require('@tryghost/errors');
const labsUtil = require('../../../services/labs');

const labs = flag => (req, res, next) => {
    if (labsUtil.isSet(flag) === true) {
        return next();
    } else {
        return next(new errors.NotFoundError());
    }
};

labs.members = labs('members');

module.exports = labs;
