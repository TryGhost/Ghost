const debug = require('@tryghost/debug')('services:routing:controllers:unsubscribe');
const path = require('path');
const url = require('url');

const urlUtils = require('../../../../shared/url-utils');
const megaService = require('../../../../server/services/mega');
const renderer = require('../../rendering');
const labs = require('../../../../shared/labs');

module.exports = async function unsubscribeController(req, res) {
    debug('unsubscribeController');

    if (labs.isSet('multipleNewslettersUI')) {
        const {query} = url.parse(req.url, true);

        if (!query || !query.uuid) {
            res.writeHead(400);
            return res.end('Email address not found.');
        }

        const redirectUrl = new URL(urlUtils.urlFor('home', true));
        redirectUrl.searchParams.append('uuid', query.uuid);
        if (query.newsletter) {
            redirectUrl.searchParams.append('newsletter', query.newsletter);
        }
        redirectUrl.searchParams.append('action', 'unsubscribe');

        return res.redirect(302, redirectUrl.href);
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

    return renderer.renderer(req, res, data);
};
