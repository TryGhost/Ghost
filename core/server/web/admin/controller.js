const debug = require('@tryghost/debug')('web:admin:controller');
const path = require('path');
const config = require('../../../shared/config');
const updateCheck = require('../../update-check');

/**
 * @description Admin controller to handle /ghost/ requests.
 *
 * Every request to the admin panel will re-trigger the update check service.
 *
 * @param req
 * @param res
 */
module.exports = function adminController(req, res) {
    debug('index called');

    // CASE: trigger update check unit and let it run in background, don't block the admin rendering
    updateCheck();

    const defaultTemplate = config.get('env') === 'production' ? 'default-prod.html' : 'default.html';
    const templatePath = path.resolve(config.get('paths').adminViews, defaultTemplate);
    const headers = {};

    if (config.get('adminFrameProtection')) {
        headers['X-Frame-Options'] = 'sameorigin';
    }

    res.sendFile(templatePath, {headers});
};
