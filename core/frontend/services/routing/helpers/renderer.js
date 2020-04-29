const debug = require('ghost-ignition').debug('services:routing:helpers:renderer');
const setContext = require('./context');
const templates = require('./templates');

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
    res.render(res._template, data);
};
