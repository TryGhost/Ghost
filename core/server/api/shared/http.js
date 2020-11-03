const url = require('url');
const debug = require('ghost-ignition').debug('api:shared:http');
const shared = require('../shared');
const models = require('../../models');

/**
 * @description HTTP wrapper.
 *
 * This wrapper is used in the routes definition (see web/).
 * The wrapper receives the express request, prepares the frame and forwards the request to the pipeline.
 *
 * @param {Function} apiImpl - Pipeline wrapper, which executes the target ctrl function.
 * @return {Function}
 */
const http = (apiImpl) => {
    return (req, res, next) => {
        debug(`External API request to ${req.url}`);
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

        // NOTE: "external user" is only used in the subscriber app. External user is ID "0".
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
            session: req.session,
            url: {
                host: req.vhost ? req.vhost.host : req.get('host'),
                pathname: url.parse(req.originalUrl || req.url).pathname,
                secure: req.secure
            },
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
                debug(`External API request to ${frame.docName}.${frame.method}`);
                return shared.headers.get(result, apiImpl.headers, frame)
                    .then(headers => ({result, headers}));
            })
            .then(({result, headers}) => {
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

                const send = (format) => {
                    if (format === 'plain') {
                        debug('plain text response');
                        return res.send(result);
                    }

                    debug('json response');
                    res.json(result || {});
                };

                let responseFormat;

                if (apiImpl.response){
                    if (typeof apiImpl.response.format === 'function') {
                        const apiResponseFormat = apiImpl.response.format();

                        if (apiResponseFormat.then) { // is promise
                            return apiResponseFormat.then((formatName) => {
                                send(formatName);
                            });
                        } else {
                            responseFormat = apiResponseFormat;
                        }
                    } else {
                        responseFormat = apiImpl.response.format;
                    }
                }

                send(responseFormat);
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
