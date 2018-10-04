const shared = require('../shared');
const models = require('../../models');

const http = (apiImpl) => {
    return (req, res, next) => {
        const frame = new shared.Frame({
            body: req.body,
            file: req.file,
            files: req.files,
            query: req.query,
            params: req.params,
            user: req.user,
            context: {
                user: ((req.user && req.user.id) || (req.user && models.User.isExternalUser(req.user.id))) ? req.user.id : null,
                client: (req.client && req.client.slug) ? req.client.slug : null,
                client_id: (req.client && req.client.id) ? req.client.id : null
            }
        });

        frame.configure({
            options: apiImpl.options,
            data: apiImpl.data
        });

        apiImpl(frame)
            .then((result) => {
                // CASE: api ctrl wants to handle the express response (e.g. streams)
                if (typeof result === 'function') {
                    return result(req, res, next);
                }

                res.status(apiImpl.statusCode || 200);

                res.set(shared.headers.get(result, apiImpl.headers));

                if (apiImpl.response && apiImpl.response.format === 'plain') {
                    return res.send(result);
                }

                res.json(result || {});
            })
            .catch((err) => {
                next(err);
            });
    };
};

module.exports = http;
