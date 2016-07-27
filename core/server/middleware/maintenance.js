var config = require('../config'),
    i18n   = require('../i18n'),
    errors = require('../errors');

module.exports = function (req, res, next) {
    if (config.maintenance.enabled) {
        return next(new errors.Maintenance(
            i18n.t('errors.general.maintenance')
        ));
    }

    next();
};
