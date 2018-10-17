const labs = require('../../../services/labs');
const common = require('../../../lib/common');

module.exports = function getFrontendClient(req, res, next) {
    if (labs.isSet('publicAPI') !== true) {
        return next();
    }

    const api = require('../../../api')['v0.1'];

    return api.clients
        .read({slug: 'ghost-frontend'})
        .then((client) => {
            client = client.clients[0];

            if (client.status === 'enabled') {
                res.locals.client = {
                    id: client.slug,
                    secret: client.secret
                };
            }

            next();
        })
        .catch((err) => {
            // Log the error, but carry on as this is non-critical
            common.logging.error(err);
            next();
        });
};
