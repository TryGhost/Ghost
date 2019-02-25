const debug = require('ghost-ignition').debug('api:shared:http');
const shared = require('../shared');
const models = require('../../models');

const http = (apiImpl) => {
    return (req, res, next) => {
        debug('request');

        let apiKey = null;
        let integration = null;
        let user = null;

        if (req.api_key) {
            apiKey = {
                id: req.api_key.get('id'),
                type: req.api_key.get('type')
            };
            integration = {
                id: req.api_key.get('integration_id')
            };
        }

        if ((req.user && req.user.id) || (req.user && models.User.isExternalUser(req.user.id))) {
            user = req.user.id;
        }

        const frame = new shared.Frame({
            body: req.body,
            file: req.file,
            files: req.files,
            query: req.query,
            params: req.params,
            user: req.user,
            context: {
                api_key: apiKey,
                user: user,
                integration: integration,
                member: (req.member || null)
            }
        });

        frame.configure({
            options: apiImpl.options,
            data: apiImpl.data
        });

        apiImpl(frame)
            .then((result) => {
                return shared.headers.get(result, apiImpl.headers, frame)
                    .then(headers => ({result, headers}));
            })
            .then(({result, headers}) => {
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
                res.set(headers);

                if (apiImpl.response && apiImpl.response.format === 'plain') {
                    debug('plain text response');
                    return res.send(result);
                }

                debug('json response');
                res.json(result || {});
            })
            .catch((err) => {
                req.frameOptions = {
                    docName: frame.docName,
                    method: frame.method
                };

                next(err);
            });
    };
};

module.exports = http;
