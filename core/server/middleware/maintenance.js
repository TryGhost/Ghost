var config = require('../config'),
    i18n   = require('../i18n'),
    errors = require('../errors');

module.exports = function maintenance(req, res, next) {
    if (config.get('maintenance').enabled) {
        return next(new errors.MaintenanceError({message: i18n.t('errors.general.maintenance')}));
    }

    next();
};
