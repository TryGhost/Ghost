const debug = require('@tryghost/debug')('services:routing:controllers:unsubscribe');
const urlUtils = require('../../../../shared/url-utils');
const url = require('url');
const errors = require('@tryghost/errors');

module.exports = function unsubscribeController(req, res) {
    debug('unsubscribeController');

    const {query} = url.parse(req.url, true);

    if (!query || !query.uuid) {
        throw new errors.BadRequestError({
            message: 'Email address not found.'
        });
    }

    const redirectUrl = new URL(urlUtils.urlFor('home', true));
    redirectUrl.searchParams.append('uuid', query.uuid);
    if (query.newsletter) {
        redirectUrl.searchParams.append('newsletter', query.newsletter);
    }
    redirectUrl.searchParams.append('action', 'unsubscribe');

    return res.redirect(302, redirectUrl.href);
};
