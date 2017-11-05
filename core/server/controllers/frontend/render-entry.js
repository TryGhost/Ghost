var debug = require('ghost-ignition').debug('channels:render-post'),
    templates = require('./templates'),
    formatResponse = require('./format-response'),
    renderer = require('./renderer'),
    setResponseContext = require('./context');
/*
 * Sets the response context around an entry (post or page)
 * and renders it with the correct template.
 * Used by post preview and entry methods.
 * Returns a function that takes the entry to be rendered.
 */
module.exports = function renderEntry(req, res) {
    debug('renderEntry called');
    return function renderEntry(entry) {
        // Renderer begin
        // Format data 2 - 1 is in preview/entry
        var data = formatResponse.entry(entry);

        // Context
        setResponseContext(req, res, data);

        // Template
        // @TODO make a function that can do the different template calls
        res.template = templates.entry(entry);

        // Render Call
        return renderer(req, res, data);
    };
};
