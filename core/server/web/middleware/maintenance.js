var config = require('../../config'),
    common = require('../../lib/common');

module.exports = function maintenance(req, res, next) {
    if (config.get('maintenance').enabled) {
        return next(new common.errors.MaintenanceError({
            message: common.i18n.t('errors.general.maintenance')
        }));
    }

    next();
};
