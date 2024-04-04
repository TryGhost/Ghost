const debug = require('@tryghost/debug')('services:routing:controllers:subscribe');
const path = require('path');
const fs = require('fs');
const handlebars = require('handlebars');
const assetHelper = require('../../../helpers/asset');
const {settingsCache} = require('../../../services/proxy');

handlebars.registerHelper('asset', assetHelper);

module.exports = async function subscribeController(req, res) {
    debug('subscribeController');

    // Get the query params
    const {query} = req;
    const token = query.token || null;
    const action = query.action || null;
    const ref = query.r || null;

    if (!token || !action) {
        return res.send(404);
    }

    // Prepare context for rendering template
    const context = {
        token,
        action,
        r: ref,
        meta_title: settingsCache.get('title'),
        accent_color: settingsCache.get('accent_color')
    };
    // Compile and render the template
    const rawTemplate = fs.readFileSync(path.resolve(path.join(__dirname, '../../../views/subscribe.hbs'))).toString();
    const template = handlebars.compile(rawTemplate);
    return res.send(template(context));
};
