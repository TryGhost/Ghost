const path = require('path');
const debug = require('@tryghost/debug')('services:routing:renderer:renderer');
const {IncorrectUsageError} = require('@tryghost/errors');
const setContext = require('./context');
const templates = require('./templates');
const tpl = require('@tryghost/tpl');
const messages = {
    couldNotReadFile: 'Could not read file {file}'
};

/**
 * @description Helper function to finally render the data.
 * @param {Object} req
 * @param {Object} res
 * @param {Object} data
 */
module.exports = function renderer(req, res, data) {
    // Set response context
    setContext(req, res, data);

    // Set template
    templates.setTemplate(req, res, data);

    debug('Rendering template: ' + res._template + ' for: ' + req.originalUrl);
    debug('res.locals', res.locals);

    // CASE: You can set the content type of the page in your routes.yaml file
    if (res.routerOptions && res.routerOptions.contentType) {
        if (res.routerOptions.templates.indexOf(res._template) !== -1) {
            res.type(res.routerOptions.contentType);
        }
    }

    // Render Call
    res.render(res._template, data, function (err, html) {
        if (err) {
            if (err.code === 'ENOENT') {
                return req.next(
                    new IncorrectUsageError({
                        message: tpl(messages.couldNotReadFile, {file: path.basename(err.path)})
                    })
                );
            }
            return req.next(err);
        }

        // CASE: a {{#get}} or {{#collection}} helper aborted during rendering, so the
        // page contains fallback content — cap public caching at 60s so the broken page recovers quickly.
        if (res.locals?.degradedRender) {
            const cacheControl = res.get('Cache-Control') || '';
            if (cacheControl.includes('public') && !/no-store|no-cache|private/.test(cacheControl)) {
                const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
                const maxAge = Math.min(60, maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 60);
                res.set('Cache-Control', `public, max-age=${maxAge}`);
            }
            res.set('X-Ghost-Degraded-Render', 'aborted-get-helper');
        }

        res.send(html);
    });
};
