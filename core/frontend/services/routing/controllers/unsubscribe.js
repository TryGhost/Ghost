const debug = require('@tryghost/debug')('services:routing:controllers:unsubscribe');
const path = require('path');
const megaService = require('../../../../server/services/mega');
const renderer = require('../../rendering');
const {config, labs} = require('../../proxy');

module.exports = async function unsubscribeController(req, res) {
    debug('unsubscribeController');

    let data = {};
    const portalUrl = config.get('portal:url');

    try {
        if (labs.isSet('multipleNewslettersUI')) {
            data.portalUrl = portalUrl;
        } else {
            data.member = await megaService.mega.handleUnsubscribeRequest(req);
        }
    } catch (err) {
        data.error = err.message;
    }

    const templateName = 'unsubscribe';

    res.routerOptions = {
        type: 'custom',
        templates: templateName,
        defaultTemplate: path.resolve(__dirname, '../../../views/', templateName)
    };

    return renderer.renderer(req, res, data);
};
