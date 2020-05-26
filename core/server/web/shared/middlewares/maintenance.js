const errors = require('@tryghost/errors');
const config = require('../../../../shared/config');
const {i18n} = require('../../../lib/common');
const urlService = require('../../../../frontend/services/url');

module.exports = function maintenance(req, res, next) {
    if (config.get('maintenance').enabled) {
        return next(new errors.MaintenanceError({
            message: i18n.t('errors.general.maintenance')
        }));
    }

    if (!urlService.hasFinished()) {
        return next(new errors.MaintenanceError({
            message: i18n.t('errors.general.maintenanceUrlService')
        }));
    }

    next();
};
