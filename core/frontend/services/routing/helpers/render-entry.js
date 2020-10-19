const debug = require('ghost-ignition').debug('services:routing:helpers:render-post');
const formatResponse = require('./format-response');
const renderer = require('./renderer');
/**
 * @description Helper to handle rendering multiple resources.
 *
 * @param {Object} req
 * @param {Object} res
 * @returns {Closure)
 */
module.exports = function renderEntry(req, res) {
    debug('renderEntry called');
    return function renderEntryClosure(entry) {
        // Format data 2 - 1 is in preview/entry
        // Render
        return renderer(req, res, formatResponse.entry(entry));
    };
};
