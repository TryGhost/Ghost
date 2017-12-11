var config = require('../../config'),
    i18n   = require('../../lib/common/i18n'),
    errors = require('../../lib/common/errors');

module.exports = function maintenance(req, res, next) {
    if (config.get('maintenance').enabled) {
        return next(new errors.MaintenanceError({message: i18n.t('errors.general.maintenance')}));
    }

    next();
};
