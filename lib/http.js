const url = require('url');
const debug = require('@tryghost/debug')('http');

const Frame = require('./Frame');
const headers = require('./headers');

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
    return async (req, res, next) => {
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

        if (req.user?.id) {
            user = req.user.id;
        }

        const frame = new Frame({
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

        try {
            const result = await apiImpl(frame);

            debug(`External API request to ${frame.docName}.${frame.method}`);

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
            const apiHeaders = await headers.get(result, apiImpl.headers, frame) || {};
            res.set(apiHeaders);

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
        } catch (err) {
            req.frameOptions = {
                docName: frame.docName,
                method: frame.method
            };

            next(err);
        }
    };
};

module.exports = http;
