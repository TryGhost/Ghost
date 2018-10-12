const debug = require('ghost-ignition').debug('api:shared:http');
const shared = require('../shared');
const models = require('../../models');

const http = (apiImpl) => {
    return (req, res, next) => {
        debug('request');

        const frame = new shared.Frame({
            body: req.body,
            file: req.file,
            files: req.files,
            query: req.query,
            params: req.params,
            user: req.user,
            context: {
                api_key_id: (req.api_key && req.api_key.id) ? req.api_key.id : null,
                user: ((req.user && req.user.id) || (req.user && models.User.isExternalUser(req.user.id))) ? req.user.id : null
            }
        });

        frame.configure({
            options: apiImpl.options,
            data: apiImpl.data
        });

        apiImpl(frame)
            .then((result) => {
                debug(result);

                // CASE: api ctrl wants to handle the express response (e.g. streams)
                if (typeof result === 'function') {
                    debug('ctrl function call');
                    return result(req, res, next);
                }

                let statusCode = 200;
                if (typeof apiImpl.statusCode === 'function') {
                    statusCode = apiImpl.statusCode(result);
                } else if (apiImpl.statusCode) {
                    statusCode = apiImpl.statusCode;
                }

                res.status(statusCode);

                // CASE: generate headers based on the api ctrl configuration
                res.set(shared.headers.get(result, apiImpl.headers));

                if (apiImpl.response && apiImpl.response.format === 'plain') {
                    debug('plain text response');
                    return res.send(result);
                }

                debug('json response');
                res.json(result || {});
            })
            .catch((err) => {
                next(err);
            });
    };
};

module.exports = http;
