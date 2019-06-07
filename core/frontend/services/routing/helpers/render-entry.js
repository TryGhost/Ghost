const debug = require('ghost-ignition').debug('services:routing:helpers:render-post'),
    formatResponse = require('./format-response'),
    renderer = require('./renderer');
/**
 * @description Helper to handle rendering multiple resources.
 *
 * @param {Object} req
 * @param {Object} res
 * @returns {Closure)
 */
module.exports = function renderEntry(req, res) {
    debug('renderEntry called');
    return function renderEntry(entry) {
        // Format data 2 - 1 is in preview/entry
        // Render
        return renderer(req, res, formatResponse.entry(entry));
    };
};
