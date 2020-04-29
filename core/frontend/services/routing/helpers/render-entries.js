const debug = require('ghost-ignition').debug('services:routing:helpers:render-entries');
const formatResponse = require('./format-response');
const renderer = require('./renderer');

/**
 * @description Helper to handle rendering multiple resources.
 *
 * @param {Object} req
 * @param {Object} res
 * @returns {Closure)
 */
module.exports = function renderEntries(req, res) {
    debug('renderEntries called');
    return function renderEntries(result) {
        // Format data 2
        // Render
        return renderer(req, res, formatResponse.entries(result));
    };
};
