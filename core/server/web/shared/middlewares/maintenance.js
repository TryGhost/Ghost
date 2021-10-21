const errors = require('@tryghost/errors');
const config = require('../../../../shared/config');
const tpl = require('@tryghost/tpl');
const urlService = require('../../../services/url');

const messages = {
    maintenance: 'Site is currently undergoing maintenance, please wait a moment then retry.',
    maintenanceUrlService: 'Site is starting up, please wait a moment then retry.'
};

module.exports = function maintenance(req, res, next) {
    if (config.get('maintenance').enabled) {
        return next(new errors.MaintenanceError({
            message: tpl(messages.maintenance)
        }));
    }

    if (!urlService.hasFinished()) {
        return next(new errors.MaintenanceError({
            message: tpl(messages.maintenanceUrlService)
        }));
    }

    next();
};
