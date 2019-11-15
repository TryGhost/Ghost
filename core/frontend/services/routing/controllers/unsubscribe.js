const debug = require('ghost-ignition').debug('services:routing:controllers:unsubscribe');
const path = require('path');
const megaService = require('../../../../server/services/mega');
const labsService = require('../../../../server/services/labs');
const helpers = require('../../../services/routing/helpers');

module.exports = async function unsubscribeController(req, res, next) {
    debug('unsubscribeController');

    if (!labsService.isSet('members')) {
        return next();
    }

    let data = {};

    try {
        data.member = await megaService.mega.handleUnsubscribeRequest(req);
    } catch (err) {
        data.error = err.message;
    }

    const templateName = 'unsubscribe';

    res.routerOptions = {
        type: 'custom',
        templates: templateName,
        defaultTemplate: path.resolve(__dirname, '../../../views/', templateName)
    };

    return helpers.renderer(req, res, data);
};
