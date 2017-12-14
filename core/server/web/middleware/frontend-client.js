var api = require('../../api'),
    labs = require('../../services/labs'),
    common = require('../../lib/common');

module.exports = function getFrontendClient(req, res, next) {
    if (labs.isSet('publicAPI') !== true) {
        return next();
    }

    return api.clients
        .read({slug: 'ghost-frontend'})
        .then(function handleClient(client) {
            client = client.clients[0];

            if (client.status === 'enabled') {
                res.locals.client = {
                    id: client.slug,
                    secret: client.secret
                };
            }

            next();
        })
        .catch(function (err) {
            // Log the error, but carry on as this is non-critical
            common.logging.error(err);
            next();
        });
};
