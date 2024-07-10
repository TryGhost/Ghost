const debug = require('@tryghost/debug')('services:routing:controllers:unsubscribe');
const url = require('url');
const members = require('../../../../server/services/members');
const urlUtils = require('../../../../shared/url-utils');
const logging = require('@tryghost/logging');

module.exports = async function unsubscribeController(req, res) {
    debug('unsubscribeController');

    const {query} = url.parse(req.url, true);

    if (!query || !query.uuid) {
        res.writeHead(400);
        return res.end('Email address not found.');
    }

    if (req.method === 'POST') {
        logging.info('[List-Unsubscribe] Received POST unsubscribe for ' + query.uuid + ', newsletter: ' + (query.newsletter ?? 'null') + ', comments: ' + (query.comments ?? 'false'));

        // Do an actual unsubscribe
        try {
            const member = await members.api.members.get({uuid: query.uuid}, {withRelated: ['newsletters']});
            if (member) {
                if (query.comments) {
                    // Unsubscribe from comments
                    await members.api.members.update({
                        enable_comment_notifications: false
                    }, {
                        id: member.id
                    });
                } else {
                    const filteredNewsletters = query.newsletter ?
                        member.related('newsletters').models
                            .filter(n => n.get('uuid') !== query.newsletter)
                            .map(n => ({id: n.id}))
                        : [];
                    await members.api.members.update({
                        newsletters: filteredNewsletters
                    }, {
                        id: member.id
                    });
                }
            }
        } catch (e) {
            logging.error({
                err: e,
                message: '[List-Unsubscribe] Failed POST unsubscribe for ' + query.uuid
            });
            return res.status(400).end();
        }

        return res.status(201).end();
    }

    const redirectUrl = new URL(urlUtils.urlFor('home', true));
    redirectUrl.searchParams.append('uuid', query.uuid);
    if (query.newsletter) {
        redirectUrl.searchParams.append('newsletter', query.newsletter);
    }
    if (query.comments) {
        redirectUrl.searchParams.append('comments', query.comments);
    }
    redirectUrl.searchParams.append('action', 'unsubscribe');

    return res.redirect(302, redirectUrl.href);
};
