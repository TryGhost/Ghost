const labsUtil = require('../../../services/labs');
const common = require('../../../lib/common');

const labs = flag => (req, res, next) => {
    if (labsUtil.isSet(flag) === true) {
        return next();
    } else {
        return next(new common.errors.NotFoundError());
    }
};

labs.members = labs('members');

module.exports = labs;
