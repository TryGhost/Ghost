const debug = require('ghost-ignition').debug('services:routing:helpers:render-post'),
    formatResponse = require('./format-response'),
    renderer = require('./renderer');
/*
 * Sets the response context around an entry (post or page)
 * and renders it with the correct template.
 * Used by post preview and entry methods.
 * Returns a function that takes the entry to be rendered.
 */
module.exports = function renderEntry(req, res) {
    debug('renderEntry called');
    return function renderEntry(entry) {
        // Format data 2 - 1 is in preview/entry
        // Render
        return renderer(req, res, formatResponse.entry(entry));
    };
};
